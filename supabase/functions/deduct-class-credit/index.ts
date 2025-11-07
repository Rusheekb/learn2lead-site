// Deno.serve is built-in, no import needed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEDUCT-CREDIT] ${step}${detailsStr}`);
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

  try {
    logStep("Function started");

    // Authenticate user
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

    // Get user role
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (!profile || !['tutor', 'admin'].includes(profile.role)) {
      throw new Error("Only tutors and admins can complete classes");
    }

    // Parse request body
    const { student_id, class_id, class_title } = await req.json();

    if (!student_id || !class_id || !class_title) {
      throw new Error("Missing required fields: student_id, class_id, class_title");
    }

    logStep("Input validated", { student_id, class_id, class_title });

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
          message: `Class already completed. ${existingDebit.balance_after} class${existingDebit.balance_after === 1 ? '' : 'es'} remaining.`
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

    // Calculate new balance (ledger is now the single source of truth)
    const newBalance = subscription.credits_remaining - 1;
    logStep("Calculated new balance", { credits_before: subscription.credits_remaining, credits_after: newBalance });

    // Log transaction in ledger (trigger will auto-sync subscription table)
    const { data: ledgerEntry, error: ledgerError } = await supabaseClient
      .from("class_credits_ledger")
      .insert({
        student_id,
        subscription_id: subscription.id,
        transaction_type: "debit",
        amount: -1,
        balance_after: newBalance,
        reason: `Class completed: ${class_title}`,
        related_class_id: class_id
      })
      .select("id")
      .single();

    if (ledgerError) {
      logStep("ERROR: Failed to log transaction", { error: ledgerError });
      throw new Error("Failed to log credit transaction");
    }

    logStep("Transaction logged", { transaction_id: ledgerEntry.id });

    // Determine appropriate message based on balance
    let message = '';
    if (newBalance < 0) {
      message = `Credit deducted. Account is ${Math.abs(newBalance)} class${Math.abs(newBalance) === 1 ? '' : 'es'} overdrawn. Credits will renew at next billing cycle.`;
    } else if (newBalance === 0) {
      message = `Credit deducted. No classes remaining. Credits will renew at next billing cycle.`;
    } else {
      message = `Credit deducted. ${newBalance} class${newBalance === 1 ? '' : 'es'} remaining.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_remaining: newBalance,
        transaction_id: ledgerEntry.id,
        is_negative: newBalance < 0,
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
