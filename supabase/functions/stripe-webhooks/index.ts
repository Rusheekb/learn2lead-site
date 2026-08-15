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
            supabaseClient,
            metadata.referral_code_id,
            metadata.referrer_id,
            metadata.user_id || null,
            session.customer_email || '',
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

      case 'refund.created': {
        const refund = event.data.object as Stripe.Refund;
        await handleRefundCreated(stripe, supabaseClient, refund);
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

// ─── refund.created ─────────────────────────────────────────────────────────────
// Claws back credits proportionally when a credit-pack purchase is refunded, in
// full or in part. Allows the resulting balance to go negative if hours were
// already used before the refund — surfaced via the existing overdrawn UI
// rather than silently capped at zero, so nothing about the account's real
// state is hidden.
//
// Listens to refund.created rather than charge.refunded: Stripe's own event
// description for charge.refunded says to use refund.created for refund
// details, and confirmed live — the charge.refunded payload's nested
// `refunds.data` list came back empty, so charge.refunded alone can't be
// relied on to carry the refund it's supposedly reporting.
async function handleRefundCreated(
  stripe: Stripe,
  supabaseClient: any,
  refund: Stripe.Refund
) {
  const paymentIntentId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : refund.payment_intent?.id;

  if (!paymentIntentId) {
    logStep('refund.created: no payment_intent on refund, skipping', {
      refundId: refund.id,
    });
    return;
  }

  logStep('Processing refund', {
    refundId: refund.id,
    refundAmount: refund.amount,
  });

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const session = sessions.data[0];

  if (!session) {
    logStep(
      'refund.created: no checkout session found for payment_intent — not a credit-pack purchase, skipping',
      { paymentIntentId }
    );
    return;
  }

  // The original credit grant for this purchase — its `amount` is exactly
  // how many hours were added, which is what we're proportionally reversing.
  const { data: originalEntry, error: originalError } = await supabaseClient
    .from('class_credits_ledger')
    .select('student_id, subscription_id, amount')
    .eq('invoice_id', session.id)
    .eq('transaction_type', 'credit')
    .maybeSingle();

  if (originalError || !originalEntry) {
    logStep(
      'refund.created: no original credit entry found for session, skipping',
      { sessionId: session.id, error: originalError?.message }
    );
    return;
  }

  // The refund object itself doesn't carry the original charge's total
  // amount — needed as the denominator for the proportional-refund math.
  const chargeId =
    typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;

  if (!chargeId) {
    logStep('refund.created: no charge id on refund, skipping', {
      refundId: refund.id,
    });
    return;
  }

  const charge = await stripe.charges.retrieve(chargeId);

  if (!charge.amount || charge.amount <= 0) {
    logStep('refund.created: charge has no positive amount, skipping', {
      chargeId,
    });
    return;
  }

  const refundFraction = refund.amount / charge.amount;
  const creditsToDeduct =
    Math.round(originalEntry.amount * refundFraction * 100) / 100;

  if (creditsToDeduct <= 0) {
    logStep('refund.created: computed zero credits to deduct, skipping', {
      refundFraction,
      originalAmount: originalEntry.amount,
    });
    return;
  }

  // Same atomic, idempotent path everything else uses — row-locks the
  // subscription and no-ops if this refund id was already processed.
  const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
    'apply_credit_ledger_entry',
    {
      p_student_id: originalEntry.student_id,
      p_subscription_id: originalEntry.subscription_id,
      p_transaction_type: 'debit',
      p_amount: -creditsToDeduct,
      p_reason: `Refund processed - $${(refund.amount / 100).toFixed(2)} refunded`,
      p_invoice_id: refund.id,
      p_dollar_amount: refund.amount / 100,
      p_allow_negative: true,
    }
  );

  if (rpcError || !rpcResult?.success) {
    logStep('refund.created: failed to deduct credits', {
      error: rpcError,
      result: rpcResult,
    });
    throw rpcError || new Error('Failed to deduct credits for refund');
  }

  if (rpcResult.idempotent) {
    logStep('refund.created: refund already processed, no action needed', {
      refundId: refund.id,
    });
    return;
  }

  logStep('refund.created: credits deducted', {
    creditsDeducted: creditsToDeduct,
    newBalance: rpcResult.new_balance,
  });

  await supabaseClient.from('notifications').insert({
    user_id: originalEntry.student_id,
    message: `${creditsToDeduct} hour${creditsToDeduct === 1 ? '' : 's'} removed from your balance following a $${(refund.amount / 100).toFixed(2)} refund.`,
    type: 'refund_processed',
  });

  await sendRefundNotificationEmail(
    supabaseClient,
    originalEntry.student_id,
    creditsToDeduct,
    refund.amount / 100,
    rpcResult.new_balance
  );

  if (rpcResult.new_balance < 0) {
    await sendAdminOverdrawnRefundAlert(
      supabaseClient,
      originalEntry.student_id,
      rpcResult.new_balance
    );
  }
}

// ─── sendRefundNotificationEmail ────────────────────────────────────────────────
async function sendRefundNotificationEmail(
  supabaseClient: any,
  studentId: string,
  creditsDeducted: number,
  refundAmount: number,
  newBalance: number
) {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      logStep('Skipping refund email - RESEND_API_KEY not configured');
      return;
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', studentId)
      .single();

    if (!profile?.email) return;

    const studentName = profile.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Valued Student';

    const balanceLine =
      newBalance < 0
        ? `<p style="margin:0;font-weight:bold;color:#dc2626;">Your balance is now ${Math.abs(newBalance)} hour${Math.abs(newBalance) === 1 ? '' : 's'} overdrawn.</p>`
        : `<p style="margin:0;font-weight:bold;">Remaining balance: ${newBalance} hour${newBalance === 1 ? '' : 's'}</p>`;

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.page>',
      to: [profile.email],
      subject: 'Refund Processed - Balance Updated',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1a1a2e;">Refund Processed</h2>
          <p>Hi ${studentName},</p>
          <p>A refund of $${refundAmount.toFixed(2)} has been processed for your account, and your hours balance has been adjusted accordingly.</p>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 8px 0;">Hours removed: <strong>${creditsDeducted}</strong></p>
            ${balanceLine}
          </div>
          <p style="font-size:14px;color:#666;">If you have any questions about this refund, please contact your admin.</p>
          <p><strong>The Learn2Lead Team</strong></p>
        </div>`,
    });

    logStep('Refund notification email sent', { email: profile.email });
  } catch (error) {
    logStep('WARNING: Failed to send refund notification email', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── sendAdminOverdrawnRefundAlert ──────────────────────────────────────────────
// Only fires when a refund pushes the balance negative — the student already
// used hours that were just refunded, so an admin needs to follow up.
async function sendAdminOverdrawnRefundAlert(
  supabaseClient: any,
  studentId: string,
  newBalance: number
) {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) return;

    const { data: student } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', studentId)
      .single();

    const { data: admins } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) return;

    const studentLabel = student
      ? `${student.first_name || ''} ${student.last_name || ''}`.trim() ||
        student.email
      : studentId;

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.page>',
      to: admins.map((a: { email: string }) => a.email),
      subject: `Refund pushed ${studentLabel} into a negative hours balance`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#dc2626;">Refund Resulted in Overdrawn Balance</h2>
          <p>A refund was processed for <strong>${studentLabel}</strong>, and they had already used more hours than the refunded amount covers.</p>
          <p style="font-weight:bold;">New balance: ${newBalance} hours (overdrawn)</p>
          <p>This may need manual follow-up depending on the situation.</p>
          <p><strong>The Learn2Lead System</strong></p>
        </div>`,
    });

    logStep('Admin overdrawn-refund alert sent', { studentId, newBalance });
  } catch (error) {
    logStep('WARNING: Failed to send admin overdrawn-refund alert', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Flat bonus hours credited to a referrer's own balance per successful
// referral. Not a dollar amount — Stripe customer balance only applies to
// Invoices, and this app never creates one (every purchase is a one-time
// payment Checkout Session), so a dollar credit there would silently never
// apply to anything. Hours go through the same ledger every other credit in
// this app goes through, so they're guaranteed to actually be usable.
const REFERRAL_BONUS_HOURS = 1;

// ─── processReferralReward ─────────────────────────────────────────────────────
async function processReferralReward(
  supabaseClient: any,
  referralCodeId: string,
  referrerId: string,
  newCustomerUserId: string | null,
  newCustomerEmail: string,
  sessionId: string
) {
  try {
    logStep('Processing referral reward', {
      referralCodeId,
      referrerId,
      bonusHours: REFERRAL_BONUS_HOURS,
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

    const { data: referrerSub, error: referrerSubError } = await supabaseClient
      .from('student_subscriptions')
      .select('id')
      .eq('student_id', referrerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (referrerSubError || !referrerSub) {
      logStep('ERROR: Referrer has no subscription record to credit', {
        referrerId,
      });
      return;
    }

    // Distinct invoice_id from the referee's own purchase credit (which uses
    // sessionId directly) — reusing sessionId here would make this call look
    // like a duplicate of that entry and silently no-op via the idempotency
    // check instead of crediting the referrer.
    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
      'apply_credit_ledger_entry',
      {
        p_student_id: referrerId,
        p_subscription_id: referrerSub.id,
        p_transaction_type: 'credit',
        p_amount: REFERRAL_BONUS_HOURS,
        p_reason: `Referral reward - ${newCustomerEmail} signed up with your code`,
        p_invoice_id: `referral_bonus_${sessionId}`,
      }
    );

    if (rpcError || !rpcResult?.success) {
      logStep('ERROR crediting referrer bonus hours', {
        error: rpcError,
        result: rpcResult,
      });
      return;
    }

    if (rpcResult.idempotent) {
      logStep('Referral bonus already credited, skipping rest', { sessionId });
      return;
    }

    logStep('Referrer credited', {
      referrerId,
      bonusHours: REFERRAL_BONUS_HOURS,
      newBalance: rpcResult.new_balance,
    });

    // The unique index on referral_usage.subscription_id prevents double-inserts on retry
    const { error: usageError } = await supabaseClient
      .from('referral_usage')
      .insert({
        referral_code_id: referralCodeId,
        used_by_user_id: newCustomerUserId || referrerId,
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
      message: `Your referral code was used by ${newCustomerEmail}! You earned ${REFERRAL_BONUS_HOURS} free hour.`,
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
