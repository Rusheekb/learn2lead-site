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

        // Idempotency guard: if a ledger entry already references this invoice, skip
        const { data: dupRows, error: dupError } = await supabaseClient
          .from('class_credits_ledger')
          .select('id')
          .ilike('reason', `%${invoiceId}%`);
        if (dupError) {
          logStep('WARNING: Dup check failed', { error: dupError.message });
        }
        if (dupRows && dupRows.length > 0) {
          logStep('Duplicate invoice detected, skipping crediting', { invoiceId });
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
          // Update existing subscription and add credits
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
              credits_remaining: newCredits,
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

          const { error: ledgerError } = await supabaseClient
            .from('class_credits_ledger')
            .insert({
              student_id: userId,
              subscription_id: existingSub.id,
              transaction_type: 'credit',
              amount: plan.classes_per_month,
              balance_after: newCredits,
              reason: `Monthly subscription renewal - ${plan.name} (invoice: ${invoiceId})`,
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
          // Create new subscription record
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
              credits_remaining: plan.classes_per_month,
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

          const { error: ledgerError } = await supabaseClient
            .from('class_credits_ledger')
            .insert({
              student_id: userId,
              subscription_id: newSub.id,
              transaction_type: 'credit',
              amount: plan.classes_per_month,
              balance_after: plan.classes_per_month,
              reason: `Initial subscription - ${plan.name} (invoice: ${invoiceId})`,
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
