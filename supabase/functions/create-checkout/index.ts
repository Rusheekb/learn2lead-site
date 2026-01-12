import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { priceId, referralCode } = await req.json();
    if (!priceId) throw new Error("Price ID is required");

    logStep("Creating checkout session", { priceId, referralCode: referralCode || 'none' });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer");
    }

    // Validate referral code if provided
    let stripeCouponId: string | null = null;
    let referralCodeId: string | null = null;
    let referrerId: string | null = null;
    let discountAmount: number | null = null;

    if (referralCode) {
      logStep("Validating referral code", { code: referralCode });

      // Get referral code details
      const { data: codeData, error: codeError } = await supabaseClient
        .from('referral_codes')
        .select('id, code, stripe_coupon_id, active, expires_at, max_uses, times_used, created_by, discount_amount')
        .eq('code', referralCode.toUpperCase())
        .single();

      if (codeError || !codeData) {
        logStep("Invalid referral code", { code: referralCode });
        throw new Error("Invalid referral code");
      }

      // Check if code is active
      if (!codeData.active) {
        logStep("Referral code is inactive", { code: referralCode });
        throw new Error("This referral code is no longer active");
      }

      // Check expiration
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        logStep("Referral code expired", { code: referralCode, expires_at: codeData.expires_at });
        throw new Error("This referral code has expired");
      }

      // Check max uses
      if (codeData.max_uses && codeData.times_used >= codeData.max_uses) {
        logStep("Referral code max uses reached", { code: referralCode, times_used: codeData.times_used, max_uses: codeData.max_uses });
        throw new Error("This referral code has reached its usage limit");
      }

      // Check if user has already used any referral code
      const { data: existingUsage } = await supabaseClient
        .from('referral_usage')
        .select('id')
        .eq('used_by_user_id', user.id)
        .limit(1);

      if (existingUsage && existingUsage.length > 0) {
        logStep("User has already used a referral code", { userId: user.id });
        throw new Error("You have already used a referral code");
      }

      // Prevent self-referral
      if (codeData.created_by === user.id) {
        logStep("Self-referral attempted", { userId: user.id });
        throw new Error("You cannot use your own referral code");
      }

      stripeCouponId = codeData.stripe_coupon_id;
      referralCodeId = codeData.id;
      referrerId = codeData.created_by;
      discountAmount = codeData.discount_amount;

      logStep("Referral code validated", { 
        codeId: referralCodeId, 
        referrerId, 
        stripeCouponId,
        discountAmount 
      });
    }

    // Build checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/pricing?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        referral_code_id: referralCodeId || '',
        referrer_id: referrerId || '',
        discount_amount: discountAmount?.toString() || '',
      },
    };

    // Apply coupon if referral code is valid
    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }];
      logStep("Applying coupon to checkout", { couponId: stripeCouponId });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});