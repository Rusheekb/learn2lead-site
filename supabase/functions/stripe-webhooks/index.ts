import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Best-effort webhook event logging — never let logging errors fail the webhook.
async function logWebhookEvent(
  supabaseClient: any,
  stripeEventId: string,
  eventType: string,
  isTestEvent: boolean,
  status: 'received' | 'processed' | 'failed' | 'skipped',
  errorMessage?: string
) {
  try {
    if (status === 'received') {
      await supabaseClient.from('stripe_webhook_events').upsert(
        {
          stripe_event_id: stripeEventId,
          event_type: eventType,
          status: 'received',
          is_test_event: isTestEvent,
        },
        { onConflict: 'stripe_event_id', ignoreDuplicates: true }
      );
    } else {
      await supabaseClient
        .from('stripe_webhook_events')
        .update({ status, error_message: errorMessage ?? null })
        .eq('stripe_event_id', stripeEventId);
    }
  } catch (e) {
    logStep('WARNING: failed to log webhook event', {
      stripeEventId,
      status,
      error: String(e),
    });
  }
}

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  let eventId = 'unknown';
  let eventType = 'unknown';
  let isTestEvent = false;

  try {
    logStep('Webhook received');

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      logStep('ERROR: Missing signature');
      throw new Error('No Stripe signature found in request headers');
    }

    // Don't gate test-secret verification behind a manually-toggled STRIPE_MODE
    // secret (same fragility class as the create-checkout bug — STRIPE_MODE is
    // not actually set, so this was always defaulting to 'live' and silently
    // rejecting every genuine test-mode webhook event). Just try whichever
    // secret actually verifies the signature.
    const liveSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const testSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');

    if (!liveSecret && !testSecret) {
      throw new Error(
        'Neither STRIPE_WEBHOOK_SECRET nor STRIPE_WEBHOOK_SECRET_TEST is set'
      );
    }

    const tempStripe = new Stripe(
      Deno.env.get('STRIPE_SECRET_KEY') || 'sk_placeholder',
      { apiVersion: '2025-08-27.basil' }
    );

    let event: Stripe.Event | undefined;
    let verificationSucceeded = false;

    if (liveSecret) {
      try {
        event = await tempStripe.webhooks.constructEventAsync(
          body,
          signature,
          liveSecret
        );
        logStep('Webhook signature verified with live secret');
        verificationSucceeded = true;
      } catch (_liveErr) {
        logStep('Live secret verification failed');
      }
    }

    if (!verificationSucceeded && testSecret) {
      try {
        event = await tempStripe.webhooks.constructEventAsync(
          body,
          signature,
          testSecret
        );
        logStep('Webhook signature verified with test secret');
        isTestEvent = true;
        verificationSucceeded = true;
      } catch (_testErr) {
        logStep('ERROR: Test secret verification also failed');
      }
    }

    if (!verificationSucceeded || !event) {
      throw new Error('Webhook signature verification failed');
    }

    eventId = event.id;
    eventType = event.type;

    const stripeKey = isTestEvent
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST') ||
        Deno.env.get('STRIPE_SECRET_KEY') ||
        ''
      : Deno.env.get('STRIPE_SECRET_KEY') || '';
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    logStep('Event type', { type: event.type, eventId, isTestEvent });

    // Log event received (idempotent upsert — duplicates are silently ignored)
    await logWebhookEvent(
      supabaseClient,
      eventId,
      eventType,
      isTestEvent,
      'received'
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        logStep('Checkout session completed', {
          sessionId: session.id,
          customerId: session.customer,
          mode: session.mode,
        });

        if (metadata.referral_code_id && metadata.referrer_id) {
          await processReferralReward(
            stripe,
            supabaseClient,
            metadata.referral_code_id,
            metadata.referrer_id,
            session.customer as string,
            session.customer_email || '',
            metadata.discount_amount
              ? parseFloat(metadata.discount_amount)
              : 25,
            session.id
          );
        }

        if (session.mode === 'payment' && session.payment_status === 'paid') {
          await allocateCreditsFromCheckout(stripe, supabaseClient, session);
        }

        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.auto_renewal === 'true') {
          await handleAutoRenewalRecovery(supabaseClient, pi);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.auto_renewal === 'true') {
          await handleAutoRenewalPaymentFailed(supabaseClient, pi);
        }
        break;
      }

      default:
        logStep('Unhandled event type', { type: event.type });
    }

    await logWebhookEvent(
      supabaseClient,
      eventId,
      eventType,
      isTestEvent,
      'processed'
    );

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in webhook', { message: errorMessage });

    if (eventId !== 'unknown') {
      await logWebhookEvent(
        supabaseClient,
        eventId,
        eventType,
        isTestEvent,
        'failed',
        errorMessage
      );
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

// ─── payment_intent.payment_failed ────────────────────────────────────────────
// Fires when Stripe definitively fails an off-session PaymentIntent (declined card,
// insufficient funds, etc.). Updates the student's auto-renewal error state so both
// the student and admin see why it failed, rather than leaving a silent void.
async function handleAutoRenewalPaymentFailed(
  supabaseClient: any,
  pi: Stripe.PaymentIntent
) {
  const studentId = pi.metadata?.user_id;
  if (!studentId) {
    logStep(
      'payment_intent.payment_failed: missing user_id metadata, skipping',
      { id: pi.id }
    );
    return;
  }

  const stripeReason = pi.last_payment_error?.message || 'Payment declined';
  const errorMsg = `Card declined: ${stripeReason}. Please update your payment method.`;

  logStep('Auto-renewal payment failed', {
    id: pi.id,
    studentId,
    reason: stripeReason,
  });

  await supabaseClient
    .from('auto_renewal_settings')
    .update({ last_renewal_error: errorMsg })
    .eq('student_id', studentId);

  await supabaseClient.from('notifications').insert({
    user_id: studentId,
    message: `Auto-renewal failed: ${stripeReason}. Visit your profile to update your payment method.`,
    type: 'auto_renewal_failed',
  });

  // Send failure email
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
    await resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.page>',
      to: [profile.email],
      subject: 'Action Required: Auto-Renewal Failed',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#dc2626;">Auto-Renewal Failed</h2>
          <p>Hi ${studentName},</p>
          <p>We were unable to charge your saved payment method for your credit pack renewal.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-weight:bold;">Reason: ${stripeReason}</p>
          </div>
          <p>To keep your tutoring sessions uninterrupted, please update your payment method and purchase credits:</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://learn2lead.page/pricing"
               style="background:#2D46B9;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Buy Credits
            </a>
          </div>
          <p style="font-size:13px;color:#666;">
            Completing a new purchase will automatically save your updated card for future renewals.
          </p>
          <p><strong>The Learn2Lead Team</strong></p>
        </div>`,
    });

    logStep('Auto-renewal failure email sent', { email: profile.email });
  } catch (e) {
    logStep('WARNING: Failed to send auto-renewal failure email', {
      error: String(e),
    });
  }
}

// ─── payment_intent.succeeded (auto-renewal recovery) ─────────────────────────
async function handleAutoRenewalRecovery(
  supabaseClient: any,
  pi: Stripe.PaymentIntent
) {
  const studentId = pi.metadata?.user_id;
  const planName = pi.metadata?.plan_name;

  if (!studentId || !planName) {
    logStep('payment_intent.succeeded: missing metadata, skipping recovery', {
      id: pi.id,
    });
    return;
  }

  logStep(
    'payment_intent.succeeded: recovering missing credits from auto-renewal',
    {
      id: pi.id,
      studentId,
      planName,
    }
  );

  const { data: plan } = await supabaseClient
    .from('subscription_plans')
    .select('*')
    .ilike('name', planName)
    .eq('active', true)
    .single();

  if (!plan) {
    logStep('payment_intent.succeeded: plan not found for recovery', {
      planName,
      id: pi.id,
    });
    return;
  }

  const { data: sub } = await supabaseClient
    .from('student_subscriptions')
    .select('id')
    .eq('student_id', studentId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (!sub) {
    logStep(
      'payment_intent.succeeded: no active subscription found for recovery',
      { studentId, id: pi.id }
    );
    return;
  }

  // Atomic: row-locks the subscription and no-ops if invoice_id was already
  // processed, so a concurrent duplicate webhook delivery can't double-credit.
  const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
    'apply_credit_ledger_entry',
    {
      p_student_id: studentId,
      p_subscription_id: sub.id,
      p_transaction_type: 'credit',
      p_amount: plan.classes_per_month,
      p_reason: `Auto-renewal (webhook recovery): ${plan.name}`,
      p_invoice_id: pi.id,
      p_dollar_amount: pi.amount / 100,
    }
  );

  if (rpcError || !rpcResult?.success) {
    logStep('payment_intent.succeeded: recovery ledger write failed', {
      error: rpcError,
      result: rpcResult,
    });
    return;
  }

  if (rpcResult.idempotent) {
    logStep(
      'payment_intent.succeeded: credits already allocated, no recovery needed',
      { id: pi.id }
    );
    return;
  }

  await supabaseClient.from('notifications').insert({
    user_id: studentId,
    message: `${plan.classes_per_month} credits added from your recent auto-renewal (${plan.name}).`,
    type: 'auto_renewal_success',
  });

  logStep('payment_intent.succeeded: recovery complete', {
    newBalance: rpcResult.new_balance,
    id: pi.id,
  });
}

// ─── allocateCreditsFromCheckout ───────────────────────────────────────────────
async function allocateCreditsFromCheckout(
  stripe: Stripe,
  supabaseClient: any,
  session: Stripe.Checkout.Session
) {
  const sessionId = session.id;
  const customerId = session.customer as string;
  const customerEmail =
    session.customer_email || session.customer_details?.email || '';
  const metadata = session.metadata || {};
  const userId = metadata.user_id;

  logStep('Allocating credits from checkout', {
    sessionId,
    customerId,
    customerEmail,
  });

  const { data: existingEntry } = await supabaseClient
    .from('class_credits_ledger')
    .select('id')
    .eq('invoice_id', sessionId);

  if (existingEntry && existingEntry.length > 0) {
    logStep('Credits already allocated for this session, skipping', {
      sessionId,
    });
    return;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 1,
  });
  const priceId = lineItems.data[0]?.price?.id;

  if (!priceId) {
    logStep('ERROR: No price ID found in checkout session', { sessionId });
    throw new Error(
      `No price ID found in checkout session ${sessionId} — Stripe will retry`
    );
  }

  const { data: plan, error: planError } = await supabaseClient
    .from('subscription_plans')
    .select('*')
    .eq('stripe_price_id', priceId)
    .single();

  if (planError || !plan) {
    logStep('ERROR: No plan found for price', {
      priceId,
      error: planError?.message,
    });
    throw new Error(
      `No subscription plan found for price ${priceId} — Stripe will retry`
    );
  }

  let profileId = userId;
  if (!profileId && customerEmail) {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('email', customerEmail)
      .single();
    profileId = profile?.id;
  }

  if (!profileId) {
    logStep('ERROR: Cannot find user for credit allocation', {
      customerEmail,
      userId,
    });
    throw new Error(
      `Cannot find user for credit allocation — email: ${customerEmail}, userId: ${userId} — Stripe will retry`
    );
  }

  const { data: existingSub } = await supabaseClient
    .from('student_subscriptions')
    .select('id')
    .eq('student_id', profileId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (existingSub) {
    // Atomic: row-locks the subscription and no-ops if this sessionId was already
    // processed, so a duplicate webhook delivery can't double-credit.
    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
      'apply_credit_ledger_entry',
      {
        p_student_id: profileId,
        p_subscription_id: existingSub.id,
        p_transaction_type: 'credit',
        p_amount: plan.classes_per_month,
        p_reason: `Credit pack purchase - ${plan.name}`,
        p_invoice_id: sessionId,
        p_dollar_amount: (session.amount_total || 0) / 100,
      }
    );

    if (rpcError || !rpcResult?.success) {
      logStep('ERROR creating ledger entry', {
        error: rpcError,
        result: rpcResult,
      });
      throw rpcError || new Error('Failed to allocate credits');
    }

    logStep('Credits added to existing record', {
      newCredits: rpcResult.new_balance,
      sessionId,
    });

    if (!rpcResult.idempotent) {
      await sendPurchaseConfirmationEmail(
        customerEmail || '',
        supabaseClient,
        plan.name,
        plan.classes_per_month,
        rpcResult.new_balance,
        (session.amount_total || 0) / 100
      );
    }
  } else {
    const { data: newSub, error: insertError } = await supabaseClient
      .from('student_subscriptions')
      .insert({
        student_id: profileId,
        plan_id: plan.id,
        stripe_subscription_id: `purchase_${sessionId}`,
        stripe_customer_id: customerId || `checkout_${profileId}`,
        status: 'active',
        credits_remaining: 0,
        credits_allocated: plan.classes_per_month,
      })
      .select()
      .single();

    if (insertError) {
      logStep('ERROR creating subscription record', { error: insertError });
      throw insertError;
    }

    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
      'apply_credit_ledger_entry',
      {
        p_student_id: profileId,
        p_subscription_id: newSub.id,
        p_transaction_type: 'credit',
        p_amount: plan.classes_per_month,
        p_reason: `Initial credit pack purchase - ${plan.name}`,
        p_invoice_id: sessionId,
        p_dollar_amount: (session.amount_total || 0) / 100,
      }
    );

    if (rpcError || !rpcResult?.success) {
      logStep('ERROR creating initial ledger entry', {
        error: rpcError,
        result: rpcResult,
      });
      throw rpcError || new Error('Failed to allocate initial credits');
    }

    logStep('New subscription created with credits', {
      subscriptionId: newSub.id,
      sessionId,
    });

    if (!rpcResult.idempotent) {
      await sendPurchaseConfirmationEmail(
        customerEmail || '',
        supabaseClient,
        plan.name,
        plan.classes_per_month,
        rpcResult.new_balance,
        (session.amount_total || 0) / 100
      );

      // Alert admins about the new student so they can pair a tutor promptly
      await sendAdminNewStudentAlert(
        supabaseClient,
        customerEmail || '',
        plan.name,
        plan.classes_per_month
      );
    }
  }
}

// ─── processReferralReward ─────────────────────────────────────────────────────
async function processReferralReward(
  stripe: Stripe,
  supabaseClient: any,
  referralCodeId: string,
  referrerId: string,
  newCustomerStripeId: string,
  newCustomerEmail: string,
  discountAmount: number,
  sessionId: string
) {
  try {
    logStep('Processing referral reward', {
      referralCodeId,
      referrerId,
      discountAmount,
    });

    const { data: existingUsage } = await supabaseClient
      .from('referral_usage')
      .select('id')
      .eq('subscription_id', sessionId)
      .maybeSingle();

    if (existingUsage) {
      logStep('Referral already processed for this session, skipping', {
        sessionId,
      });
      return;
    }

    const { data: referrerProfile, error: referrerError } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .eq('id', referrerId)
      .single();

    if (referrerError || !referrerProfile) {
      logStep('ERROR: Referrer not found', { referrerId });
      return;
    }

    const referrerCustomers = await stripe.customers.list({
      email: referrerProfile.email,
      limit: 1,
    });

    if (referrerCustomers.data.length === 0) {
      logStep('ERROR: Referrer has no Stripe customer record', {
        email: referrerProfile.email,
      });
      return;
    }

    const referrerCustomerId = referrerCustomers.data[0].id;
    const creditAmount = Math.round(discountAmount * 100);

    await stripe.customers.createBalanceTransaction(referrerCustomerId, {
      amount: -creditAmount,
      currency: 'usd',
      description: 'Referral reward - new customer signup',
    });

    logStep('Referrer credited', {
      referrerCustomerId,
      creditAmount: discountAmount,
    });

    const { data: newUserProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('email', newCustomerEmail)
      .single();

    // The unique index on referral_usage.subscription_id prevents double-inserts on retry
    const { error: usageError } = await supabaseClient
      .from('referral_usage')
      .insert({
        referral_code_id: referralCodeId,
        used_by_user_id: newUserProfile?.id || referrerId,
        used_by_email: newCustomerEmail,
        subscription_id: sessionId,
      });

    if (usageError) {
      logStep('WARNING: Failed to record referral usage (may be duplicate)', {
        error: usageError.message,
      });
    }

    const { data: codeData } = await supabaseClient
      .from('referral_codes')
      .select('times_used')
      .eq('id', referralCodeId)
      .single();

    if (codeData) {
      await supabaseClient
        .from('referral_codes')
        .update({ times_used: (codeData.times_used || 0) + 1 })
        .eq('id', referralCodeId);
    }

    await supabaseClient.from('notifications').insert({
      user_id: referrerId,
      message: `Your referral code was used by ${newCustomerEmail}! You earned a $${discountAmount} credit.`,
      type: 'referral_reward',
    });

    logStep('Referral reward processed successfully');
  } catch (error) {
    logStep('ERROR processing referral reward', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── sendPurchaseConfirmationEmail ─────────────────────────────────────────────
async function sendPurchaseConfirmationEmail(
  customerEmail: string,
  supabaseClient: any,
  planName: string,
  creditsAdded: number,
  totalCredits: number,
  amountPaid: number
) {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      logStep('Skipping email - RESEND_API_KEY not configured');
      return;
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .ilike('email', customerEmail)
      .maybeSingle();

    const studentName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Valued Student';

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.page>',
      to: [customerEmail],
      subject: 'Your Credit Pack Purchase Confirmation',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#16a34a;">Credits Added!</h2>
          <p>Dear ${studentName},</p>
          <p>Thank you for purchasing the ${planName}!</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 12px 0;font-size:16px;font-weight:bold;">Purchase Summary</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;border-bottom:1px solid #dcfce7;">Pack</td><td style="text-align:right;font-weight:bold;border-bottom:1px solid #dcfce7;">${planName}</td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #dcfce7;">Amount Paid</td><td style="text-align:right;font-weight:bold;border-bottom:1px solid #dcfce7;">$${amountPaid.toFixed(2)}</td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #dcfce7;">Credits Added</td><td style="text-align:right;font-weight:bold;color:#16a34a;border-bottom:1px solid #dcfce7;">+${creditsAdded} hrs</td></tr>
              <tr><td style="padding:6px 0;">Available Balance</td><td style="text-align:right;font-weight:bold;color:#16a34a;">${totalCredits} hrs</td></tr>
            </table>
          </div>
          <p>Your credits never expire — use them at your own pace.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://learn2lead.page/dashboard"
               style="background:#2D46B9;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Go to Dashboard
            </a>
          </div>
          <p><strong>The Learn2Lead Team</strong></p>
        </div>`,
    });

    logStep('Purchase confirmation email sent', { customerEmail, planName });
  } catch (error) {
    logStep('WARNING: Failed to send purchase confirmation email', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── sendAdminNewStudentAlert ──────────────────────────────────────────────────
// Fires only on a brand-new student's first purchase so admins know to pair a tutor.
async function sendAdminNewStudentAlert(
  supabaseClient: any,
  studentEmail: string,
  planName: string,
  creditsPurchased: number
) {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) return;

    // Fetch all admin emails
    const { data: admins } = await supabaseClient
      .from('profiles')
      .select('email, first_name')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) return;

    const resend = new Resend(resendApiKey);
    const adminEmails = admins.map((a: { email: string }) => a.email);

    await resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.page>',
      to: adminEmails,
      subject: `New Student: ${studentEmail} just purchased ${creditsPurchased} hours`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#2D46B9;">New Student Purchase</h2>
          <p>A new student just completed their first purchase and is ready to be paired with a tutor.</p>
          <div style="background:#EBF1FF;border:1px solid #c7d4f8;border-radius:8px;padding:16px;margin:16px 0;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:5px 0;color:#555;">Student</td><td style="text-align:right;font-weight:bold;">${studentEmail}</td></tr>
              <tr><td style="padding:5px 0;color:#555;">Pack</td><td style="text-align:right;font-weight:bold;">${planName}</td></tr>
              <tr><td style="padding:5px 0;color:#555;">Hours</td><td style="text-align:right;font-weight:bold;">${creditsPurchased} hrs</td></tr>
            </table>
          </div>
          <p style="font-weight:bold;color:#dc2626;">Action required: assign a tutor in the Admin Dashboard.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://learn2lead.page/admin-dashboard?tab=assignments"
               style="background:#2D46B9;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Open Assignments Tab
            </a>
          </div>
          <p><strong>The Learn2Lead System</strong></p>
        </div>`,
    });

    logStep('Admin new-student alert sent', {
      studentEmail,
      adminCount: adminEmails.length,
    });
  } catch (error) {
    logStep('WARNING: Failed to send admin new-student alert', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
