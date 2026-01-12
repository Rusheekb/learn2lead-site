import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GENERATE-REFERRAL-CODE] ${step}${detailsStr}`);
};

const generateRandomSuffix = (length: number): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded I, O, 0, 1 for clarity
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe and check subscription status
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Updated to use consistent API version
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if user has an active Stripe subscription
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found", { email: user.email });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Active Stripe subscription required to generate a referral code",
          requires_subscription: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active Stripe subscription found", { customerId });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Active Stripe subscription required to generate a referral code",
          requires_subscription: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    logStep("Active Stripe subscription verified", {
      customerId,
      subscriptionId: subscriptions.data[0].id,
    });

    // Get user profile for name
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError.message });
      throw new Error("Failed to fetch user profile");
    }

    // Check if user already has a referral code
    const { data: existingCode, error: existingError } = await supabaseClient
      .from("referral_codes")
      .select("code")
      .eq("created_by", user.id)
      .maybeSingle();

    if (existingError) {
      logStep("Error checking existing code", { error: existingError.message });
      throw new Error("Failed to check existing referral code");
    }

    if (existingCode) {
      logStep("User already has a referral code", { code: existingCode.code });
      return new Response(
        JSON.stringify({ 
          success: true, 
          code: existingCode.code,
          message: "You already have a referral code" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Generate unique code based on user's name with random suffix
    const firstName = profile.first_name || profile.email?.split("@")[0] || "USER";
    const namePart = firstName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
    const randomSuffix = generateRandomSuffix(4);
    const baseCode = `${namePart}-${randomSuffix}`;
    
    let uniqueCode = baseCode;
    let suffix = 1;
    let codeExists = true;

    while (codeExists) {
      const { data: checkCode } = await supabaseClient
        .from("referral_codes")
        .select("id")
        .eq("code", uniqueCode)
        .maybeSingle();

      if (!checkCode) {
        codeExists = false;
      } else {
        suffix++;
        uniqueCode = `${baseCode}-${suffix}`;
      }
    }

    logStep("Generated unique code", { code: uniqueCode });

    // Create Stripe coupon for this referral code
    const coupon = await stripe.coupons.create({
      amount_off: 2500, // $25 in cents
      currency: "usd",
      duration: "once",
      name: `Referral: ${uniqueCode}`,
      metadata: {
        referral_code: uniqueCode,
        created_by_user_id: user.id,
      },
    });

    logStep("Created Stripe coupon", { couponId: coupon.id });

    // Insert referral code into database
    const { data: newCode, error: insertError } = await supabaseClient
      .from("referral_codes")
      .insert({
        code: uniqueCode,
        stripe_coupon_id: coupon.id,
        created_by: user.id,
        discount_amount: 25.00,
        active: true,
        times_used: 0,
      })
      .select()
      .single();

    if (insertError) {
      logStep("Error inserting referral code", { error: insertError.message });
      // Clean up the Stripe coupon if DB insert fails
      await stripe.coupons.del(coupon.id);
      throw new Error("Failed to create referral code");
    }

    logStep("Referral code created successfully", { code: uniqueCode });

    return new Response(
      JSON.stringify({ 
        success: true, 
        code: uniqueCode,
        message: "Referral code created successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});