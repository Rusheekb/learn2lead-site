import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANUAL-CREDIT-ALLOCATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    logStep("Admin verified", { adminId: user.id });

    const { email } = await req.json();
    if (!email) throw new Error("Email is required");
    logStep("Processing request for user", { email });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error(`No Stripe customer found for ${email}`);
    }
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0].price.product as string;
    logStep("Found active subscription", { subscriptionId: subscription.id, productId });

    // Get subscription plan to determine credits
    const { data: plan } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("stripe_product_id", productId)
      .single();

    if (!plan) {
      throw new Error(`No subscription plan found for product ${productId}`);
    }
    logStep("Found subscription plan", { planName: plan.name, creditsToAllocate: plan.classes_per_month });

    // Get user ID from email
    const { data: userProfile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!userProfile) {
      throw new Error(`No user profile found for ${email}`);
    }
    const studentId = userProfile.id;

    // Check if subscription already exists in our database
    const { data: existingSub } = await supabaseClient
      .from("student_subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (existingSub) {
      logStep("Subscription already exists in database", { 
        existingCredits: existingSub.credits_remaining,
        subscriptionId: existingSub.id 
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: "Subscription already has credits allocated",
        currentCredits: existingSub.credits_remaining,
        planName: plan.name
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create subscription record (credits will be set by ledger trigger)
    const { data: newSub, error: subError } = await supabaseClient
      .from("student_subscriptions")
      .insert({
        student_id: studentId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan_id: plan.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        credits_allocated: plan.classes_per_month,
        credits_remaining: 0, // Will be set by ledger trigger
      })
      .select()
      .single();

    if (subError) throw subError;
    logStep("Created subscription record", { subscriptionId: newSub.id });

    // Create ledger entry
    const { error: ledgerError } = await supabaseClient
      .from("class_credits_ledger")
      .insert({
        student_id: studentId,
        subscription_id: newSub.id,
        transaction_type: "allocation",
        amount: plan.classes_per_month,
        balance_after: plan.classes_per_month,
        reason: `Manual allocation - ${plan.name} plan`,
      });

    if (ledgerError) throw ledgerError;
    logStep("Created ledger entry");

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully allocated ${plan.classes_per_month} credits`,
      creditsAllocated: plan.classes_per_month,
      planName: plan.name,
      subscriptionId: subscription.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
