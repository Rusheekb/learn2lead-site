import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
    apiVersion: "2025-08-27.basil" 
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: Missing signature", { headers: req.headers });
      throw new Error("No Stripe signature found in request headers");
    }

    // Verify webhook signature for security
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: Webhook secret not configured");
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { error: errorMessage });
      throw new Error(`Webhook signature verification failed: ${errorMessage}`);
    }

    logStep("Event type", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        // Handle referral rewards when checkout is completed
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        
        logStep("Checkout session completed", { 
          sessionId: session.id,
          customerId: session.customer,
          metadata 
        });

        // Process referral if present
        if (metadata.referral_code_id && metadata.referrer_id) {
          await processReferralReward(
            stripe,
            supabaseClient,
            metadata.referral_code_id,
            metadata.referrer_id,
            session.customer as string,
            session.customer_email || '',
            metadata.discount_amount ? parseFloat(metadata.discount_amount) : 25,
            session.subscription as string
          );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceId = invoice.id;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as any)?.id;

        // The subscription field can be missing on some invoices; resolve robustly
        let subscriptionId: string | null = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as any)?.id ?? null;
        let subscription: Stripe.Subscription | null = null;

        logStep("Payment succeeded", { subscriptionId, customerId, invoiceId });

        try {
          if (subscriptionId) {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
          } else {
            logStep("Subscription ID missing on invoice, hydrating invoice", { invoiceId });
            const hydrated = await stripe.invoices.retrieve(invoiceId, {
              expand: ['subscription', 'lines.data.price']
            });
            subscriptionId = typeof hydrated.subscription === 'string'
              ? hydrated.subscription
              : (hydrated.subscription as any)?.id ?? null;
            if (!subscription && typeof hydrated.subscription !== 'string') {
              subscription = (hydrated.subscription as Stripe.Subscription) || null;
            }
            if (!subscription && subscriptionId) {
              subscription = await stripe.subscriptions.retrieve(subscriptionId);
            }
            // Final fallback: list active subs for the customer
            if (!subscription && customerId) {
              const subs = await stripe.subscriptions.list({
                customer: customerId,
                status: 'active',
                limit: 1,
              });
              if (subs.data.length) {
                subscription = subs.data[0];
                subscriptionId = subscription.id;
              }
            }
          }
        } catch (e) {
          logStep('ERROR resolving subscription', { invoiceId, customerId, error: (e as Error).message });
        }

        // Determine price id from subscription first, then invoice lines
        let priceId: string | null = null;
        if (subscription) {
          priceId = subscription.items?.data?.[0]?.price?.id ?? null;
          logStep('Resolved subscription', { subscriptionId: subscription.id, priceId });
        }
        if (!priceId) {
          priceId = invoice.lines?.data?.[0]?.price?.id ?? null;
          logStep('Price resolved from invoice lines', { priceId });
        }
        if (!priceId) {
          logStep('ERROR: Unable to determine price for invoice', { invoiceId, customerId });
          // Return 200 to acknowledge; Stripe will not retry and we avoid double credits later
          break;
        }

        // Fetch customer email
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = typeof customer !== 'string' && 'email' in customer ? (customer as any).email as string | null : null;
        if (!customerEmail) {
          logStep('ERROR: Customer email not found', { customerId, invoiceId });
          break;
        }

        // IMPROVED: Idempotency guard using exact invoice_id column matching
        // First try exact match on invoice_id column (preferred)
        const { data: exactDupRows, error: exactDupError } = await supabaseClient
          .from('class_credits_ledger')
          .select('id')
          .eq('invoice_id', invoiceId);
        
        if (!exactDupError && exactDupRows && exactDupRows.length > 0) {
          logStep('Duplicate invoice detected via invoice_id column, skipping', { invoiceId });
          break;
        }

        // Fallback: Check for legacy entries that used reason field (for backwards compatibility)
        const { data: legacyDupRows, error: legacyDupError } = await supabaseClient
          .from('class_credits_ledger')
          .select('id')
          .ilike('reason', `%${invoiceId}%`);
        
        if (legacyDupError) {
          logStep('WARNING: Legacy dup check failed', { error: legacyDupError.message });
        }
        if (legacyDupRows && legacyDupRows.length > 0) {
          logStep('Duplicate invoice detected via legacy reason field, skipping', { invoiceId });
          break;
        }

        // Get user from email
        const { data: profiles, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .ilike('email', customerEmail)
          .single();

        if (profileError || !profiles) {
          logStep('ERROR: User not found for email', { customerEmail, invoiceId });
          throw new Error(`User not found for email: ${customerEmail}`);
        }

        const userId = profiles.id;

        // Get plan details by price id
        const { data: plan, error: planError } = await supabaseClient
          .from('subscription_plans')
          .select('*')
          .eq('stripe_price_id', priceId)
          .single();

        if (planError || !plan) {
          logStep('ERROR: No subscription plan found', {
            priceId,
            customerId,
            customerEmail,
            invoiceId,
            planError: planError?.message
          });
          throw new Error(`Plan not found for price: ${priceId}`);
        }

        // Check if subscription record exists
        const { data: existingSub } = await supabaseClient
          .from('student_subscriptions')
          .select('id, credits_remaining')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (existingSub) {
          // Update existing subscription period (credits will be added via ledger + trigger)
          const newCredits = existingSub.credits_remaining + plan.classes_per_month;
          const currentPeriodStart = subscription?.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : invoice.lines?.data?.[0]?.period?.start
            ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
            : null;
          const currentPeriodEnd = subscription?.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : invoice.lines?.data?.[0]?.period?.end
            ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
            : null;

          const { error: updateError } = await supabaseClient
            .from('student_subscriptions')
            .update({
              status: subscription?.status ?? 'active',
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              credits_allocated: plan.classes_per_month,
            })
            .eq('id', existingSub.id);

          if (updateError) {
            logStep('ERROR updating subscription', {
              message: updateError.message,
              code: updateError.code,
              details: updateError.details,
            });
            throw updateError;
          }

          // IMPROVED: Store invoice_id in dedicated column for exact matching
          const { error: ledgerError } = await supabaseClient
            .from('class_credits_ledger')
            .insert({
              student_id: userId,
              subscription_id: existingSub.id,
              transaction_type: 'credit',
              amount: plan.classes_per_month,
              balance_after: newCredits,
              reason: `Monthly subscription renewal - ${plan.name}`,
              invoice_id: invoiceId,
            });

          if (ledgerError) {
            logStep('ERROR creating ledger entry for existing subscription', {
              message: ledgerError.message,
              code: ledgerError.code,
              details: ledgerError.details,
            });
            throw ledgerError;
          }

          logStep("Subscription updated and credits added", { newCredits, invoiceId });
        } else {
          // Create new subscription record (credits will be set via ledger + trigger)
          const currentPeriodStart = subscription?.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : invoice.lines?.data?.[0]?.period?.start
            ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
            : null;
          const currentPeriodEnd = subscription?.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : invoice.lines?.data?.[0]?.period?.end
            ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
            : null;

          const { data: newSub, error: insertError } = await supabaseClient
            .from('student_subscriptions')
            .insert({
              student_id: userId,
              plan_id: plan.id,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: subscription?.status ?? 'active',
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              credits_remaining: 0, // Will be set by ledger trigger
              credits_allocated: plan.classes_per_month,
            })
            .select()
            .single();

          if (insertError) {
            logStep('ERROR creating new subscription', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
            });
            throw insertError;
          }

          // IMPROVED: Store invoice_id in dedicated column for exact matching
          const { error: ledgerError } = await supabaseClient
            .from('class_credits_ledger')
            .insert({
              student_id: userId,
              subscription_id: newSub.id,
              transaction_type: 'credit',
              amount: plan.classes_per_month,
              balance_after: plan.classes_per_month,
              reason: `Initial subscription - ${plan.name}`,
              invoice_id: invoiceId,
            });

          if (ledgerError) {
            logStep('ERROR creating initial ledger entry', {
              message: ledgerError.message,
              code: ledgerError.code,
              details: ledgerError.details,
            });
            throw ledgerError;
          }

          logStep("New subscription created with credits", { subscriptionId: newSub.id, invoiceId });
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        logStep("Payment failed", { subscriptionId });

        // Mark subscription as past_due
        const { error } = await supabaseClient
          .from('student_subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) throw error;

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        logStep("Subscription cancelled", { subscriptionId });

        // Mark subscription as cancelled (keep history)
        const { error } = await supabaseClient
          .from('student_subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) throw error;

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        logStep("Subscription updated", { subscriptionId, status: subscription.status });

        // Safety: handle potentially missing/invalid period dates
        const currentPeriodStart = subscription.current_period_start 
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null;
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        // Sync status changes
        const { error } = await supabaseClient
          .from('student_subscriptions')
          .update({
            status: subscription.status,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) throw error;

        break;
      }

      case "customer.subscription.paused": {
        // Handle subscription pause events
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        logStep("Subscription paused", { subscriptionId });

        const { error } = await supabaseClient
          .from('student_subscriptions')
          .update({ status: 'paused' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) throw error;

        break;
      }

      case "customer.subscription.resumed": {
        // Handle subscription resume events
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        logStep("Subscription resumed", { subscriptionId });

        const { error } = await supabaseClient
          .from('student_subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) throw error;

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error : { raw: error };
    logStep("ERROR in webhook", { message: errorMessage, details: errorDetails });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// Process referral reward - credits the referrer
async function processReferralReward(
  stripe: Stripe,
  supabaseClient: any,
  referralCodeId: string,
  referrerId: string,
  newCustomerStripeId: string,
  newCustomerEmail: string,
  discountAmount: number,
  subscriptionId: string
) {
  try {
    logStep("Processing referral reward", { 
      referralCodeId, 
      referrerId, 
      newCustomerStripeId,
      newCustomerEmail,
      discountAmount 
    });

    // Get referrer's profile to find their email
    const { data: referrerProfile, error: referrerError } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .eq('id', referrerId)
      .single();

    if (referrerError || !referrerProfile) {
      logStep("ERROR: Referrer not found", { referrerId });
      return;
    }

    // Find the referrer's Stripe customer ID
    const referrerCustomers = await stripe.customers.list({ 
      email: referrerProfile.email, 
      limit: 1 
    });

    if (referrerCustomers.data.length === 0) {
      logStep("ERROR: Referrer has no Stripe customer record", { 
        referrerId, 
        email: referrerProfile.email 
      });
      return;
    }

    const referrerCustomerId = referrerCustomers.data[0].id;

    // Apply a credit balance to the referrer's Stripe account
    // This will be applied to their next invoice
    const creditAmount = Math.round(discountAmount * 100); // Convert to cents
    
    await stripe.customers.createBalanceTransaction(referrerCustomerId, {
      amount: -creditAmount, // Negative amount = credit
      currency: 'usd',
      description: `Referral reward - new customer signup`,
    });

    logStep("Referrer credited", { 
      referrerCustomerId, 
      creditAmount: discountAmount,
      referrerId 
    });

    // Get the new user's profile ID from their email
    const { data: newUserProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('email', newCustomerEmail)
      .single();

    // Record the referral usage
    const { error: usageError } = await supabaseClient
      .from('referral_usage')
      .insert({
        referral_code_id: referralCodeId,
        used_by_user_id: newUserProfile?.id || referrerId, // Use referrer as fallback
        used_by_email: newCustomerEmail,
        subscription_id: subscriptionId,
      });

    if (usageError) {
      logStep("WARNING: Failed to record referral usage", { error: usageError.message });
    }

    // Increment the times_used counter
    const { error: updateError } = await supabaseClient
      .from('referral_codes')
      .update({ times_used: supabaseClient.rpc('increment', { x: 1 }) })
      .eq('id', referralCodeId);

    // Alternative: Use raw SQL increment
    if (updateError) {
      // Fallback: fetch and update
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
    }

    logStep("Referral reward processed successfully", { referralCodeId, referrerId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing referral reward", { error: errorMessage });
    // Don't throw - we don't want to fail the webhook for referral issues
  }
}
