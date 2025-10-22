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
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { error: errorMessage });
      throw new Error(`Webhook signature verification failed: ${errorMessage}`);
    }

    logStep("Event type", { type: event.type });

    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        logStep("Payment succeeded", { subscriptionId, customerId });

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = typeof customer !== 'string' && 'email' in customer ? customer.email : null;

        if (!customerEmail) {
          throw new Error("Customer email not found");
        }

        // Get user from email
        const { data: profiles, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();

        if (profileError || !profiles) {
          throw new Error(`User not found for email: ${customerEmail}`);
        }

        const userId = profiles.id;

        // Get plan details
        const { data: plan, error: planError } = await supabaseClient
          .from('subscription_plans')
          .select('*')
          .eq('stripe_price_id', priceId)
          .single();

        if (planError || !plan) {
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
          
          const { error: updateError } = await supabaseClient
            .from('student_subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              credits_remaining: newCredits,
              credits_allocated: plan.classes_per_month,
            })
            .eq('id', existingSub.id);

          if (updateError) throw updateError;

          // Log credit addition
          const { error: ledgerError } = await supabaseClient
            .from('class_credits_ledger')
            .insert({
              student_id: userId,
              subscription_id: existingSub.id,
              transaction_type: 'credit',
              amount: plan.classes_per_month,
              balance_after: newCredits,
              reason: `Monthly subscription renewal - ${plan.name}`,
            });

          if (ledgerError) throw ledgerError;

          logStep("Subscription updated and credits added", { newCredits });
        } else {
          // Create new subscription record
          const { data: newSub, error: insertError } = await supabaseClient
            .from('student_subscriptions')
            .insert({
              student_id: userId,
              plan_id: plan.id,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              credits_remaining: plan.classes_per_month,
              credits_allocated: plan.classes_per_month,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Log initial credit allocation
          const { error: ledgerError } = await supabaseClient
            .from('class_credits_ledger')
            .insert({
              student_id: userId,
              subscription_id: newSub.id,
              transaction_type: 'credit',
              amount: plan.classes_per_month,
              balance_after: plan.classes_per_month,
              reason: `Initial subscription - ${plan.name}`,
            });

          if (ledgerError) throw ledgerError;

          logStep("New subscription created with credits", { subscriptionId: newSub.id });
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

        // Sync status changes
        const { error } = await supabaseClient
          .from('student_subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
