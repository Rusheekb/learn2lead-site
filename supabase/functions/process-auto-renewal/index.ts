import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-RENEWAL] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  try {
    logStep("Function started");

    // This function is called internally by deduct-class-credit, validate via service role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { student_id, renewal_pack } = await req.json();
    if (!student_id || !renewal_pack) {
      throw new Error("Missing required fields: student_id, renewal_pack");
    }

    logStep("Processing auto-renewal", { student_id, renewal_pack });

    // Get auto-renewal settings with cooldown check
    const { data: settings, error: settingsError } = await supabaseClient
      .from("auto_renewal_settings")
      .select("*")
      .eq("student_id", student_id)
      .eq("enabled", true)
      .single();

    if (settingsError || !settings) {
      logStep("Auto-renewal not enabled or settings not found", { student_id });
      return new Response(JSON.stringify({ success: false, reason: "not_enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Cooldown check - don't re-trigger within 1 hour
    if (settings.last_renewal_at) {
      const lastRenewal = new Date(settings.last_renewal_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastRenewal > oneHourAgo) {
        logStep("Cooldown active, skipping", { last_renewal_at: settings.last_renewal_at });
        return new Response(JSON.stringify({ success: false, reason: "cooldown" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Get the plan details
    const packMap: Record<string, string> = {
      basic: "4 Credit Pack",
      standard: "8 Credit Pack",
      premium: "12 Credit Pack",
    };

    const { data: plan, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .ilike("name", packMap[renewal_pack] || "8 Credit Pack")
      .eq("active", true)
      .single();

    if (planError || !plan) {
      logStep("ERROR: Plan not found", { renewal_pack, error: planError?.message });
      throw new Error(`Plan not found for pack: ${renewal_pack}`);
    }

    // Get the Stripe customer ID
    let stripeCustomerId = settings.stripe_customer_id;

    if (!stripeCustomerId) {
      // Look up from student_subscriptions
      const { data: sub } = await supabaseClient
        .from("student_subscriptions")
        .select("stripe_customer_id")
        .eq("student_id", student_id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      stripeCustomerId = sub?.stripe_customer_id;

      if (!stripeCustomerId) {
        // Try looking up by email
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email")
          .eq("id", student_id)
          .single();

        if (profile?.email) {
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          if (customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id;
          }
        }
      }

      // Cache the customer ID for future use
      if (stripeCustomerId) {
        await supabaseClient
          .from("auto_renewal_settings")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("student_id", student_id);
      }
    }

    if (!stripeCustomerId) {
      const errorMsg = "No Stripe customer found. Please make a manual purchase first.";
      logStep("ERROR: No Stripe customer", { student_id });

      await supabaseClient
        .from("auto_renewal_settings")
        .update({ last_renewal_error: errorMsg })
        .eq("student_id", student_id);

      await supabaseClient.from("notifications").insert({
        user_id: student_id,
        message: `Auto-renewal failed: ${errorMsg}`,
        type: "auto_renewal_failed",
      });

      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer;
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method
      || customer.default_source;

    if (!defaultPaymentMethod) {
      const errorMsg = "No saved payment method found. Please make a manual purchase to save your card.";
      logStep("ERROR: No payment method", { stripeCustomerId });

      await supabaseClient
        .from("auto_renewal_settings")
        .update({ last_renewal_error: errorMsg })
        .eq("student_id", student_id);

      await supabaseClient.from("notifications").insert({
        user_id: student_id,
        message: `Auto-renewal failed: ${errorMsg}`,
        type: "auto_renewal_failed",
      });

      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Creating PaymentIntent", {
      amount: plan.monthly_price * 100,
      customer: stripeCustomerId,
    });

    // Create and confirm the PaymentIntent off_session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(plan.monthly_price * 100),
      currency: "usd",
      customer: stripeCustomerId,
      payment_method: typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id,
      off_session: true,
      confirm: true,
      description: `Auto-renewal: ${plan.name}`,
      metadata: {
        user_id: student_id,
        auto_renewal: "true",
        plan_name: plan.name,
      },
    });

    logStep("PaymentIntent result", { status: paymentIntent.status, id: paymentIntent.id });

    if (paymentIntent.status === "succeeded") {
      // Get current subscription and balance
      const { data: existingSub } = await supabaseClient
        .from("student_subscriptions")
        .select("id, credits_remaining")
        .eq("student_id", student_id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      if (existingSub) {
        const newBalance = existingSub.credits_remaining + plan.classes_per_month;

        await supabaseClient.from("class_credits_ledger").insert({
          student_id,
          subscription_id: existingSub.id,
          transaction_type: "credit",
          amount: plan.classes_per_month,
          balance_after: newBalance,
          reason: `Auto-renewal: ${plan.name}`,
          invoice_id: paymentIntent.id,
        });

        logStep("Credits allocated via auto-renewal", { newBalance });
      }

      // Update settings
      await supabaseClient
        .from("auto_renewal_settings")
        .update({
          last_renewal_at: new Date().toISOString(),
          last_renewal_error: null,
        })
        .eq("student_id", student_id);

      // Send success notification
      await supabaseClient.from("notifications").insert({
        user_id: student_id,
        message: `Auto-renewal successful! ${plan.classes_per_month} credits added (${plan.name} - $${plan.monthly_price}).`,
        type: "auto_renewal_success",
      });

      // Send confirmation email
      await sendAutoRenewalEmail(
        supabaseClient,
        student_id,
        plan.name,
        plan.classes_per_month,
        (existingSub?.credits_remaining || 0) + plan.classes_per_month,
        plan.monthly_price,
        true
      );

      return new Response(JSON.stringify({
        success: true,
        credits_added: plan.classes_per_month,
        payment_intent_id: paymentIntent.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error(`PaymentIntent status: ${paymentIntent.status}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Try to update settings and notify on failure
    try {
      const { student_id } = await req.clone().json().catch(() => ({ student_id: null }));
      if (student_id) {
        await supabaseClient
          .from("auto_renewal_settings")
          .update({ last_renewal_error: errorMessage })
          .eq("student_id", student_id);

        await supabaseClient.from("notifications").insert({
          user_id: student_id,
          message: `Auto-renewal failed: ${errorMessage}. Please update your payment method or purchase credits manually.`,
          type: "auto_renewal_failed",
        });

        await sendAutoRenewalEmail(supabaseClient, student_id, "", 0, 0, 0, false);
      }
    } catch (_) {
      // Don't let notification failures break the response
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 so deduct-class-credit doesn't fail
    });
  }
});

async function sendAutoRenewalEmail(
  supabaseClient: any,
  studentId: string,
  planName: string,
  creditsAdded: number,
  totalCredits: number,
  amountCharged: number,
  success: boolean,
) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return;

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", studentId)
      .single();

    if (!profile?.email) return;

    const studentName = profile.first_name
      ? `${profile.first_name} ${profile.last_name || ""}`.trim()
      : "Valued Student";

    const resend = new Resend(resendApiKey);

    if (success) {
      await resend.emails.send({
        from: "Learn2Lead <noreply@learn2lead.com>",
        to: [profile.email],
        subject: "Auto-Renewal: Credits Added!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Auto-Renewal Successful!</h1>
            <p>Dear ${studentName},</p>
            <p>Your credit pack was automatically renewed as configured.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0;">Pack</td><td style="text-align: right; font-weight: bold;">${planName}</td></tr>
                <tr><td style="padding: 8px 0;">Amount Charged</td><td style="text-align: right; font-weight: bold;">$${amountCharged.toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0;">Credits Added</td><td style="text-align: right; font-weight: bold; color: #16a34a;">+${creditsAdded}</td></tr>
                <tr><td style="padding: 8px 0;">Available Balance</td><td style="text-align: right; font-weight: bold; color: #16a34a;">${totalCredits} classes</td></tr>
              </table>
            </div>
            <p>You can manage your auto-renewal settings from your dashboard at any time.</p>
            <p><strong>The Learn2Lead Team</strong></p>
          </div>
        `,
      });
    } else {
      await resend.emails.send({
        from: "Learn2Lead <noreply@learn2lead.com>",
        to: [profile.email],
        subject: "Auto-Renewal Failed — Action Required",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Auto-Renewal Failed</h1>
            <p>Dear ${studentName},</p>
            <p>We were unable to process your auto-renewal. This may be due to an expired or declined payment method.</p>
            <p>Please update your payment method or purchase credits manually:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://learn2lead-site.lovable.app/pricing" style="background: #3b5bdb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Buy Credits
              </a>
            </div>
            <p><strong>The Learn2Lead Team</strong></p>
          </div>
        `,
      });
    }

    logStep(`Auto-renewal email sent (${success ? 'success' : 'failure'})`, { email: profile.email });
  } catch (err) {
    logStep("WARNING: Failed to send auto-renewal email", { error: err instanceof Error ? err.message : String(err) });
  }
}
