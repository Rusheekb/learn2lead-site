import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEDUCT-CREDIT] ${step}${detailsStr}`);
};

/** Round to nearest 0.5, minimum 0.5 */
const roundToHalfHour = (hours: number): number =>
  Math.max(0.5, Math.round(hours * 2) / 2);

Deno.serve(async (req) => {
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    logStep("User authenticated", { userId: userData.user.id });

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (!profile || !['tutor', 'admin'].includes(profile.role)) {
      throw new Error("Only tutors and admins can complete classes");
    }

    const { student_id, class_id, class_title, duration_hours } = await req.json();

    if (!student_id || !class_id || !class_title) {
      throw new Error("Missing required fields: student_id, class_id, class_title");
    }

    const creditsToDeduct = roundToHalfHour(duration_hours || 1);

    logStep("Input validated", { student_id, class_id, class_title, duration_hours, creditsToDeduct });

    // Check for duplicate completion (idempotency)
    const { data: existingDebit, error: debitCheckError } = await supabaseClient
      .from("class_credits_ledger")
      .select("id, balance_after, created_at")
      .eq("related_class_id", class_id)
      .eq("transaction_type", "debit")
      .maybeSingle();

    if (debitCheckError) {
      logStep("ERROR: Failed to check for existing debit", { error: debitCheckError });
    }

    if (existingDebit) {
      logStep("Class already completed (idempotent response)", { 
        transaction_id: existingDebit.id, 
        balance_after: existingDebit.balance_after 
      });
      return new Response(
        JSON.stringify({
          success: true,
          credits_remaining: existingDebit.balance_after,
          transaction_id: existingDebit.id,
          idempotent: true,
          message: `Class already completed. ${existingDebit.balance_after} hour${existingDebit.balance_after === 1 ? '' : 's'} remaining.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get active subscription with current credits
    const { data: subscription, error: subError } = await supabaseClient
      .from("student_subscriptions")
      .select("id, credits_remaining, status")
      .eq("student_id", student_id)
      .in("status", ["active", "trialing"])
      .single();

    if (subError || !subscription) {
      logStep("No active subscription found", { student_id });
      return new Response(
        JSON.stringify({
          success: false,
          error: "No active subscription found",
          code: "NO_SUBSCRIPTION"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    logStep("Subscription validated", { 
      subscription_id: subscription.id, 
      credits_before: subscription.credits_remaining 
    });

    // BLOCK deduction if credits are insufficient
    if (subscription.credits_remaining < creditsToDeduct) {
      logStep("Insufficient credits, blocking deduction", { 
        credits: subscription.credits_remaining,
        required: creditsToDeduct
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Insufficient hours. Need ${creditsToDeduct} but only ${subscription.credits_remaining} remaining. Please purchase more hours.`,
          code: "NO_CREDITS"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    const newBalance = subscription.credits_remaining - creditsToDeduct;
    logStep("Calculated new balance", { credits_before: subscription.credits_remaining, credits_after: newBalance, deducted: creditsToDeduct });

    // Log transaction in ledger (trigger will auto-sync subscription table)
    const { data: ledgerEntry, error: ledgerError } = await supabaseClient
      .from("class_credits_ledger")
      .insert({
        student_id,
        subscription_id: subscription.id,
        transaction_type: "debit",
        amount: -creditsToDeduct,
        balance_after: newBalance,
        reason: `Class completed: ${class_title} (${creditsToDeduct}hr${creditsToDeduct === 1 ? '' : 's'})`,
        related_class_id: class_id
      })
      .select("id")
      .single();

    if (ledgerError) {
      logStep("ERROR: Failed to log transaction", { error: ledgerError });
      throw new Error("Failed to log credit transaction");
    }

    logStep("Transaction logged", { transaction_id: ledgerEntry.id });

    let message = '';
    if (newBalance === 0) {
      message = `${creditsToDeduct} hour${creditsToDeduct === 1 ? '' : 's'} deducted. No hours remaining. Purchase more to continue.`;
    } else {
      message = `${creditsToDeduct} hour${creditsToDeduct === 1 ? '' : 's'} deducted. ${newBalance} hour${newBalance === 1 ? '' : 's'} remaining.`;
    }

    // Check auto-renewal threshold (fire-and-forget, never blocks class completion)
    try {
      const { data: renewalSettings } = await supabaseClient
        .from("auto_renewal_settings")
        .select("enabled, renewal_pack, threshold")
        .eq("student_id", student_id)
        .eq("enabled", true)
        .maybeSingle();

      if (renewalSettings && newBalance <= renewalSettings.threshold) {
        logStep("Auto-renewal threshold met, triggering renewal", {
          balance: newBalance,
          threshold: renewalSettings.threshold,
          pack: renewalSettings.renewal_pack,
        });

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        fetch(`${supabaseUrl}/functions/v1/process-auto-renewal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            student_id,
            renewal_pack: renewalSettings.renewal_pack,
          }),
        }).catch(err => {
          logStep("WARNING: Failed to invoke auto-renewal", { error: String(err) });
        });
      }
    } catch (renewalErr) {
      logStep("WARNING: Auto-renewal check failed (non-blocking)", { error: String(renewalErr) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_remaining: newBalance,
        credits_deducted: creditsToDeduct,
        transaction_id: ledgerEntry.id,
        message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        code: "INTERNAL_ERROR"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
