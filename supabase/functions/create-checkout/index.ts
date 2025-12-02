import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
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

    // Handle referral code validation
    let stripeCouponId: string | undefined;
    let referralCodeRecord: any = null;

    if (referralCode) {
      logStep("Validating referral code", { referralCode });

      // Check if user has already used a referral code
      const { data: existingUsage } = await supabaseAdmin
        .from("referral_usage")
        .select("id")
        .eq("used_by_email", user.email)
        .maybeSingle();

      if (existingUsage) {
        throw new Error("You have already used a referral code");
      }

      // Validate the referral code
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from("referral_codes")
        .select("*")
        .eq("code", referralCode.toUpperCase().trim())
        .eq("active", true)
        .maybeSingle();

      if (codeError || !codeData) {
        throw new Error("Invalid referral code");
      }

      // Check if code has expired
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        throw new Error("This referral code has expired");
      }

      // Check if code has reached max uses
      if (codeData.max_uses !== null && codeData.times_used >= codeData.max_uses) {
        throw new Error("This referral code has reached its maximum uses");
      }

      referralCodeRecord = codeData;
      stripeCouponId = codeData.stripe_coupon_id;
      logStep("Referral code validated", { codeId: codeData.id, discount: codeData.discount_amount });
    }

    // Build checkout session config
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/pricing?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        referral_code_id: referralCodeRecord?.id || null,
      },
    };

    // Add discount if referral code is valid
    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }];
      logStep("Applying discount coupon", { couponId: stripeCouponId });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Record referral usage if code was used (will be confirmed when subscription succeeds)
    if (referralCodeRecord) {
      // Update usage count
      await supabaseAdmin
        .from("referral_codes")
        .update({ times_used: referralCodeRecord.times_used + 1 })
        .eq("id", referralCodeRecord.id);

      // Record the usage
      await supabaseAdmin
        .from("referral_usage")
        .insert({
          referral_code_id: referralCodeRecord.id,
          used_by_user_id: user.id,
          used_by_email: user.email,
          subscription_id: session.id,
        });

      logStep("Referral usage recorded", { codeId: referralCodeRecord.id });
    }

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
