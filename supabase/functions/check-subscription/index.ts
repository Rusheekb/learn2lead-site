import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

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
    
    // Use anon key with auth header for proper JWT validation
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await authSupabase.auth.getUser();
    if (userError || !user) {
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
    
    const userId = user.id;
    const userEmail = user.email as string;
    
    if (!userEmail) {
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
    logStep("User authenticated", { userId, email: userEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    let activeOrPausedSub = null;

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking manual subscriptions and ledger");
    } else {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      // Check for active or paused subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 5,
      });
      
      // Find active or paused subscription
      activeOrPausedSub = subscriptions.data.find(
        (sub) => sub.status === "active" || sub.status === "paused" || sub.pause_collection
      );
    }
    
    let hasActiveSub = !!activeOrPausedSub;
    let productId = null;
    let subscriptionEnd = null;
    let creditsRemaining = 0;
    let planName = null;
    let pricePerClass = null;
    let isManualSubscription = false;
    let isPaused = false;
    let pauseResumesAt = null;

    // Check for manual subscriptions if no Stripe subscription found
    if (!hasActiveSub) {
      const { data: manualSub, error: manualError } = await supabaseClient
        .from('student_subscriptions')
        .select('id, stripe_subscription_id, status, current_period_end, plan_id')
        .eq('student_id', userId)
        .eq('status', 'active')
        .ilike('stripe_subscription_id', 'manual_%')
        .maybeSingle();
      
      if (manualSub && !manualError) {
        hasActiveSub = true;
        isManualSubscription = true;
        productId = manualSub.plan_id || 'manual';
        subscriptionEnd = manualSub.current_period_end;
        logStep("Manual subscription found", { subscriptionId: manualSub.stripe_subscription_id });
      }
    }

    // ALWAYS retrieve credits from ledger (single source of truth)
    const { data: ledgerData, error: ledgerError } = await supabaseClient
      .from('class_credits_ledger')
      .select('balance_after')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ledgerData && !ledgerError) {
      creditsRemaining = ledgerData.balance_after || 0;
      logStep("Retrieved credits from ledger", { creditsRemaining });
    } else {
      logStep("No ledger entries found");
    }

    // Get subscription details if active
    if (hasActiveSub) {
      if (!isManualSubscription && activeOrPausedSub) {
        // Stripe subscription - get metadata
        const subscription = activeOrPausedSub;
        
        // Check if subscription is paused
        if (subscription.pause_collection) {
          isPaused = true;
          if (subscription.pause_collection.resumes_at) {
            pauseResumesAt = new Date(subscription.pause_collection.resumes_at * 1000).toISOString();
          }
          logStep("Subscription is paused", { 
            subscriptionId: subscription.id, 
            resumesAt: pauseResumesAt 
          });
        }
        
        if (subscription.current_period_end) {
          try {
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
            logStep("Active Stripe subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd, isPaused });
          } catch (error) {
            logStep("Warning: Invalid subscription end date", { 
              subscriptionId: subscription.id, 
              current_period_end: subscription.current_period_end,
              error: error instanceof Error ? error.message : String(error)
            });
            subscriptionEnd = null;
          }
        } else {
          logStep("Active Stripe subscription found without end date", { subscriptionId: subscription.id });
          subscriptionEnd = null;
        }
        
        productId = subscription.items.data[0].price.product as string;
        logStep("Determined subscription tier", { productId });
      }

      // Get plan details (works for both Stripe and manual)
      const { data: subData, error: subError } = await supabaseClient
        .from('student_subscriptions')
        .select('subscription_plans(name, classes_per_month, price_per_class)')
        .eq('student_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (subData && !subError) {
        planName = subData.subscription_plans?.name || (isManualSubscription ? 'Direct Payment' : null);
        pricePerClass = subData.subscription_plans?.price_per_class || null;
        logStep("Retrieved plan details", { planName, pricePerClass, isManual: isManualSubscription });
      } else if (isManualSubscription) {
        planName = 'Direct Payment';
        pricePerClass = 35; // Default price for manual subscriptions
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      credits_remaining: creditsRemaining,
      plan_name: planName,
      price_per_class: pricePerClass,
      is_paused: isPaused,
      pause_resumes_at: pauseResumesAt
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