import Stripe from 'https://esm.sh/stripe@18.5.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2?target=deno';
import { Resend } from 'https://esm.sh/resend@2.0.0?target=deno';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-RENEWAL] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const rateLimitKey = getRateLimitKey(req, 'process-auto-renewal');
  const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (limited) return rateLimitResponse(retryAfterMs!, corsHeaders);

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const liveKey = Deno.env.get('STRIPE_SECRET_KEY');
  const testKey = Deno.env.get('STRIPE_SECRET_KEY_TEST');
  if (!liveKey && !testKey) throw new Error('No Stripe secret key configured');
  // Use live key by default; falls back to test key if only test key is available
  const stripe = new Stripe(liveKey || testKey || '', {
    apiVersion: '2025-08-27.basil',
  });

  try {
    logStep('Function started');

    // This function is called internally by deduct-class-credit, validate via service role key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const { student_id, renewal_pack } = await req.json();
    if (!student_id || !renewal_pack) {
      throw new Error('Missing required fields: student_id, renewal_pack');
    }

    logStep('Processing auto-renewal', { student_id, renewal_pack });

    // Get auto-renewal settings first (read-only, to know renewal_pack/threshold/etc)
    const { data: settings, error: settingsError } = await supabaseClient
      .from('auto_renewal_settings')
      .select('*')
      .eq('student_id', student_id)
      .eq('enabled', true)
      .single();

    if (settingsError || !settings) {
      logStep('Auto-renewal not enabled or settings not found', { student_id });
      return new Response(
        JSON.stringify({ success: false, reason: 'not_enabled' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Atomic claim: a plain UPDATE ... WHERE ... RETURNING is a single statement,
    // so Postgres guarantees only one concurrent caller can win this row. This
    // replaces the old "SELECT last_renewal_at, check in app code, write it later"
    // pattern — which had a real race: two classes completing back-to-back could
    // both pass the cooldown check before either one wrote the timestamp, resulting
    // in the student's card being charged twice for the same renewal event. Setting
    // last_renewal_at now (before the charge even runs) also means a failed attempt
    // still starts the cooldown, so a bad card can't be hammered on every subsequent
    // class completion.
    const claimedAt = new Date().toISOString();
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: claimed, error: claimError } = await supabaseClient
      .from('auto_renewal_settings')
      .update({ last_renewal_at: claimedAt })
      .eq('student_id', student_id)
      .eq('enabled', true)
      .or(`last_renewal_at.is.null,last_renewal_at.lt.${oneHourAgoIso}`)
      .select('id')
      .maybeSingle();

    if (claimError) {
      logStep('ERROR: Failed to claim renewal slot', { error: claimError });
      throw new Error('Failed to claim renewal slot');
    }

    if (!claimed) {
      logStep('Cooldown active or already claimed, skipping', {
        last_renewal_at: settings.last_renewal_at,
      });
      return new Response(
        JSON.stringify({ success: false, reason: 'cooldown' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get the plan details. renewal_pack ('basic'|'standard'|'premium') maps to the
    // exact same subscription_plans rows customers see when buying a pack manually
    // (Basic Plan/Standard Plan/Premium Plan = 4/8/12 hours) — exact match, not a
    // fuzzy ILIKE, so a renamed plan fails loudly instead of silently matching nothing.
    const packMap: Record<string, string> = {
      basic: 'Basic Plan',
      standard: 'Standard Plan',
      premium: 'Premium Plan',
    };

    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('name', packMap[renewal_pack] || 'Standard Plan')
      .eq('active', true)
      .single();

    if (planError || !plan) {
      logStep('ERROR: Plan not found', {
        renewal_pack,
        error: planError?.message,
      });
      throw new Error(`Plan not found for pack: ${renewal_pack}`);
    }

    // Get the Stripe customer ID
    let stripeCustomerId = settings.stripe_customer_id;

    if (!stripeCustomerId) {
      // Look up from student_subscriptions
      const { data: sub } = await supabaseClient
        .from('student_subscriptions')
        .select('stripe_customer_id')
        .eq('student_id', student_id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      stripeCustomerId = sub?.stripe_customer_id;

      if (!stripeCustomerId) {
        // Try looking up by email
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('email')
          .eq('id', student_id)
          .single();

        if (profile?.email) {
          const customers = await stripe.customers.list({
            email: profile.email,
            limit: 1,
          });
          if (customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id;
          }
        }
      }

      // Cache the customer ID for future use
      if (stripeCustomerId) {
        await supabaseClient
          .from('auto_renewal_settings')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('student_id', student_id);
      }
    }

    if (!stripeCustomerId) {
      const errorMsg =
        'No Stripe customer found. Please make a manual purchase first.';
      logStep('ERROR: No Stripe customer', { student_id });

      await supabaseClient
        .from('auto_renewal_settings')
        .update({ last_renewal_error: errorMsg })
        .eq('student_id', student_id);

      await supabaseClient.from('notifications').insert({
        user_id: student_id,
        message: `Auto-renewal failed: ${errorMsg}`,
        type: 'auto_renewal_failed',
      });

      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get the customer's default payment method
    const customer = (await stripe.customers.retrieve(
      stripeCustomerId
    )) as Stripe.Customer;
    const defaultPaymentMethod =
      customer.invoice_settings?.default_payment_method ||
      customer.default_source;

    if (!defaultPaymentMethod) {
      const errorMsg =
        'No saved payment method found. Please make a manual purchase to save your card.';
      logStep('ERROR: No payment method', { stripeCustomerId });

      await supabaseClient
        .from('auto_renewal_settings')
        .update({ last_renewal_error: errorMsg })
        .eq('student_id', student_id);

      await supabaseClient.from('notifications').insert({
        user_id: student_id,
        message: `Auto-renewal failed: ${errorMsg}`,
        type: 'auto_renewal_failed',
      });

      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    logStep('Creating PaymentIntent', {
      amount: plan.monthly_price * 100,
      customer: stripeCustomerId,
    });

    // Create and confirm the PaymentIntent off_session. Idempotency key is tied to
    // the claim we just won above — if this function is invoked twice for the same
    // claimed window (a retry after a timeout, a duplicate trigger), Stripe itself
    // de-dupes the charge instead of creating two PaymentIntents for one renewal.
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(plan.monthly_price * 100),
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method:
          typeof defaultPaymentMethod === 'string'
            ? defaultPaymentMethod
            : defaultPaymentMethod.id,
        off_session: true,
        confirm: true,
        description: `Auto-renewal: ${plan.name}`,
        metadata: {
          user_id: student_id,
          auto_renewal: 'true',
          plan_name: plan.name,
        },
      },
      { idempotencyKey: `auto-renewal-${student_id}-${claimedAt}` }
    );

    logStep('PaymentIntent result', {
      status: paymentIntent.status,
      id: paymentIntent.id,
    });

    // SCA / 3D Secure: card requires additional authentication off-session. This can
    // never succeed without the customer present to authenticate, so retrying it
    // automatically on every future threshold-crossing would just fail silently
    // forever — auto-disable instead, matching how real dunning flows eventually
    // stop and hand control back to the customer.
    if (paymentIntent.status === 'requires_action') {
      const errorMsg =
        'Your card requires additional authentication (3D Secure) and auto-renewal has been turned off. Please make a manual purchase to re-save your card, then re-enable auto-renewal.';
      logStep('PaymentIntent requires SCA action — disabling auto-renewal', {
        id: paymentIntent.id,
      });

      await supabaseClient
        .from('auto_renewal_settings')
        .update({ last_renewal_error: errorMsg, enabled: false })
        .eq('student_id', student_id);

      await supabaseClient.from('notifications').insert({
        user_id: student_id,
        message: `Auto-renewal requires card authentication and has been turned off. Please visit the pricing page to complete a manual purchase and update your saved payment method, then re-enable auto-renewal in Settings.`,
        type: 'auto_renewal_failed',
      });

      await sendAutoRenewalEmail(
        supabaseClient,
        student_id,
        '',
        0,
        0,
        0,
        false
      );

      return new Response(
        JSON.stringify({
          success: false,
          reason: 'requires_action',
          error: errorMsg,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (paymentIntent.status === 'succeeded') {
      // Get current subscription (balance is read under lock inside the RPC)
      const { data: existingSub } = await supabaseClient
        .from('student_subscriptions')
        .select('id')
        .eq('student_id', student_id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      if (existingSub) {
        // Atomic: row-locks the subscription and no-ops if this paymentIntent was
        // already processed, so a retry/duplicate call can't double-credit.
        const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
          'apply_credit_ledger_entry',
          {
            p_student_id: student_id,
            p_subscription_id: existingSub.id,
            p_transaction_type: 'credit',
            p_amount: plan.classes_per_month,
            p_reason: `Auto-renewal: ${plan.name}`,
            p_invoice_id: paymentIntent.id,
            p_dollar_amount: plan.monthly_price,
          }
        );

        if (rpcError || !rpcResult?.success) {
          logStep('ERROR: auto-renewal ledger write failed', {
            error: rpcError,
            result: rpcResult,
          });
          throw (
            rpcError || new Error('Failed to allocate auto-renewal credits')
          );
        }

        const newBalance = rpcResult.new_balance;
        logStep('Credits allocated via auto-renewal', { newBalance });

        // Update settings
        await supabaseClient
          .from('auto_renewal_settings')
          .update({
            last_renewal_at: new Date().toISOString(),
            last_renewal_error: null,
          })
          .eq('student_id', student_id);

        await supabaseClient.from('notifications').insert({
          user_id: student_id,
          message: `Auto-renewal successful! ${plan.classes_per_month} credits added (${plan.name} - $${plan.monthly_price}).`,
          type: 'auto_renewal_success',
        });

        await sendAutoRenewalEmail(
          supabaseClient,
          student_id,
          plan.name,
          plan.classes_per_month,
          newBalance,
          plan.monthly_price,
          true
        );

        return new Response(
          JSON.stringify({
            success: true,
            credits_added: plan.classes_per_month,
            payment_intent_id: paymentIntent.id,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        // Charged but no active subscription — the webhook recovery path will handle this.
        // Log a warning so it's visible in function logs.
        logStep(
          'WARNING: PaymentIntent succeeded but no active subscription found — webhook recovery expected',
          {
            student_id,
            payment_intent_id: paymentIntent.id,
          }
        );

        return new Response(
          JSON.stringify({
            success: false,
            reason: 'no_subscription_for_credit',
            payment_intent_id: paymentIntent.id,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    } else {
      throw new Error(`PaymentIntent status: ${paymentIntent.status}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });

    // Try to update settings and notify on failure
    try {
      const { student_id } = await req
        .clone()
        .json()
        .catch(() => ({ student_id: null }));
      if (student_id) {
        await supabaseClient
          .from('auto_renewal_settings')
          .update({ last_renewal_error: errorMessage })
          .eq('student_id', student_id);

        await supabaseClient.from('notifications').insert({
          user_id: student_id,
          message: `Auto-renewal failed: ${errorMessage}. Please update your payment method or purchase credits manually.`,
          type: 'auto_renewal_failed',
        });

        await sendAutoRenewalEmail(
          supabaseClient,
          student_id,
          '',
          0,
          0,
          0,
          false
        );
      }
    } catch (_) {
      // Don't let notification failures break the response
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 so deduct-class-credit doesn't fail
      }
    );
  }
});

async function sendAutoRenewalEmail(
  supabaseClient: any,
  studentId: string,
  planName: string,
  creditsAdded: number,
  totalCredits: number,
  amountCharged: number,
  success: boolean
) {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) return;

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', studentId)
      .single();

    if (!profile?.email) return;

    const studentName = profile.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Valued Student';

    const resend = new Resend(resendApiKey);

    if (success) {
      await resend.emails.send({
        from: 'Learn2Lead <noreply@learn2lead.com>',
        to: [profile.email],
        subject: 'Auto-Renewal: Credits Added!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Auto-Renewal Successful!</h1>
            <p>Dear ${studentName},</p>
            <p>Your credit pack was automatically renewed as configured.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0;">Pack</td><td style="text-align: right; font-weight: bold;">${planName}</td></tr>
                <tr><td style="padding: 8px 0;">Amount Charged</td><td style="text-align: right; font-weight: bold;">$${amountCharged.toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0;">Credits Added</td><td style="text-align: right; font-weight: bold; color: #16a34a;">+${creditsAdded}</td></tr>
                <tr><td style="padding: 8px 0;">Available Balance</td><td style="text-align: right; font-weight: bold; color: #16a34a;">${totalCredits} classes</td></tr>
              </table>
            </div>
            <p>You can manage your auto-renewal settings from your dashboard at any time.</p>
            <p><strong>The Learn2Lead Team</strong></p>
          </div>
        `,
      });
    } else {
      await resend.emails.send({
        from: 'Learn2Lead <noreply@learn2lead.com>',
        to: [profile.email],
        subject: 'Auto-Renewal Failed — Action Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Auto-Renewal Failed</h1>
            <p>Dear ${studentName},</p>
            <p>We were unable to process your auto-renewal. This may be due to an expired or declined payment method.</p>
            <p>Please update your payment method or purchase credits manually:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://learn2lead.page/pricing" style="background: #3b5bdb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Buy Credits
              </a>
            </div>
            <p><strong>The Learn2Lead Team</strong></p>
          </div>
        `,
      });
    }

    logStep(`Auto-renewal email sent (${success ? 'success' : 'failure'})`, {
      email: profile.email,
    });
  } catch (err) {
    logStep('WARNING: Failed to send auto-renewal email', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
