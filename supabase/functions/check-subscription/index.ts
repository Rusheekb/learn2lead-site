import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({ 
        subscribed: false,
        credits_remaining: 0,
        auth_error: true,
        error: "Authentication required"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token || token === "undefined" || token === "null") {
      logStep("Invalid token format");
      return new Response(JSON.stringify({ 
        subscribed: false,
        credits_remaining: 0,
        auth_error: true,
        error: "Invalid authentication token"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ 
        subscribed: false,
        credits_remaining: 0,
        auth_error: true,
        error: "Session expired or invalid"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("User email not available");
      return new Response(JSON.stringify({ 
        subscribed: false,
        credits_remaining: 0,
        auth_error: true,
        error: "User email not available"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        credits_remaining: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let creditsRemaining = 0;
    let planName = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      
      // Handle potential null or invalid current_period_end
      if (subscription.current_period_end) {
        try {
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
        } catch (error) {
          logStep("Warning: Invalid subscription end date", { 
            subscriptionId: subscription.id, 
            current_period_end: subscription.current_period_end,
            error: error instanceof Error ? error.message : String(error)
          });
          subscriptionEnd = null;
        }
      } else {
        logStep("Active subscription found without end date", { subscriptionId: subscription.id });
        subscriptionEnd = null;
      }
      
      productId = subscription.items.data[0].price.product as string;
      logStep("Determined subscription tier", { productId });

      // Get credits from database
      const { data: subData, error: subError } = await supabaseClient
        .from('student_subscriptions')
        .select('credits_remaining, plan_id, subscription_plans(name, classes_per_month)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single();

      if (subData && !subError) {
        creditsRemaining = subData.credits_remaining || 0;
        planName = subData.subscription_plans?.name || null;
        logStep("Retrieved credits from database", { creditsRemaining, planName });
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      credits_remaining: creditsRemaining,
      plan_name: planName
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
