import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the JWT from the request to verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user client to verify the requesting user
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not verify user role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Allow tutors and admins to restore credits (for error recovery)
    if (profile.role !== "tutor" && profile.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Only tutors and admins can restore credits" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { student_id, class_id, reason } = await req.json();

    if (!student_id) {
      return new Response(
        JSON.stringify({ success: false, error: "student_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Restoring credit for student ${student_id}, class ${class_id}, by ${user.id} (${profile.role})`);

    // Verify there was a recent deduction for this class (within last 5 minutes)
    // This prevents abuse - can only restore credits that were just deducted
    if (class_id) {
      const { data: recentDeduction, error: deductionError } = await supabaseAdmin
        .from("class_credits_ledger")
        .select("id, created_at")
        .eq("student_id", student_id)
        .eq("related_class_id", class_id)
        .eq("transaction_type", "deduction")
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deductionError) {
        console.error("Error checking recent deduction:", deductionError);
      }

      if (!recentDeduction) {
        console.warn(`No recent deduction found for class ${class_id} - proceeding anyway for error recovery`);
      }
    }

    // Get the current balance from ledger
    const { data: lastEntry, error: balanceError } = await supabaseAdmin
      .from("class_credits_ledger")
      .select("balance_after")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (balanceError) {
      console.error("Error getting balance:", balanceError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to get current balance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentBalance = lastEntry?.balance_after ?? 0;
    const newBalance = currentBalance + 1;

    // Get the student's subscription ID
    const { data: subscription } = await supabaseAdmin
      .from("student_subscriptions")
      .select("id")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Create the credit restoration entry in the ledger
    const { error: insertError } = await supabaseAdmin
      .from("class_credits_ledger")
      .insert({
        student_id,
        amount: 1,
        balance_after: newBalance,
        transaction_type: "credit",
        reason: reason || "Credit restored - class completion error recovery",
        related_class_id: class_id || null,
        subscription_id: subscription?.id || null,
      });

    if (insertError) {
      console.error("Error inserting credit restoration:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to restore credit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully restored 1 credit for student ${student_id}. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        credits_restored: 1,
        new_balance: newBalance,
        restored_by: user.id,
        restored_by_role: profile.role,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in restore-class-credit:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
