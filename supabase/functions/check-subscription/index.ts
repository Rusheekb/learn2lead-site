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
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    logStep("Function started");

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
    
    // Decode JWT payload to extract user info
    let jwtPayload: any;
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) throw new Error("Invalid JWT format");
      jwtPayload = JSON.parse(atob(payloadBase64));
      if (!jwtPayload.sub) throw new Error("No sub claim in JWT");
    } catch (e) {
      logStep("JWT decode failed", { error: e instanceof Error ? e.message : String(e) });
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

    // Verify user exists via admin API
    const { data: adminUserData, error: adminError } = await supabaseClient.auth.admin.getUserById(jwtPayload.sub);
    if (adminError || !adminUserData?.user) {
      logStep("Admin user verification failed", { error: adminError?.message });
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
    
    const user = adminUserData.user;
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

    // Get credits from ledger (single source of truth)
    let creditsRemaining = 0;
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

    // Check if user has any subscription record (Stripe or manual)
    let hasAccount = false;
    let planName = null;
    let pricePerClass = null;

    const { data: subData, error: subError } = await supabaseClient
      .from('student_subscriptions')
      .select('id, status, plan_id, subscription_plans(name, price_per_class)')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subData && !subError) {
      hasAccount = true;
      planName = subData.subscription_plans?.name || 'Direct Payment';
      pricePerClass = subData.subscription_plans?.price_per_class || null;
      logStep("Found subscription record", { planName, pricePerClass });
    } else {
      // Check if there are any ledger entries at all (Zelle users may not have subscription records)
      if (ledgerData) {
        hasAccount = true;
        planName = 'Direct Payment';
        pricePerClass = 35;
        logStep("No subscription record but has ledger entries - manual/Zelle user");
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasAccount,
      credits_remaining: creditsRemaining,
      plan_name: planName,
      price_per_class: pricePerClass,
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
