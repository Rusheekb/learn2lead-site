import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=deno";
import { Resend } from "https://esm.sh/resend@1.0.0?target=deno";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getRateLimitKey, checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEDUCT-CREDIT] ${step}${detailsStr}`);
};

/** Round to nearest 0.5, minimum 0.5 */
const roundToHalfHour = (hours: number): number =>
  Math.max(0.5, Math.round(hours * 2) / 2);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

/** Send class completion summary email to student */
async function sendCompletionEmail(
  studentEmail: string,
  studentName: string,
  classTitle: string,
  subject: string,
  hoursUsed: number,
  creditsRemaining: number,
  tutorName: string
) {
  try {
    await resend.emails.send({
      from: "Learn2Lead <noreply@learn2lead.com>",
      to: studentEmail,
      subject: `Class Completed: ${classTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a2e;">✅ Class Completed</h2>
          <p>Hello ${studentName},</p>
          <p>Your class has been marked as completed. Here's a summary:</p>
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #22c55e;">
            <p style="margin: 4px 0;"><strong>Class:</strong> ${classTitle}</p>
            <p style="margin: 4px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 4px 0;"><strong>Tutor:</strong> ${tutorName}</p>
            <p style="margin: 4px 0;"><strong>Duration:</strong> ${hoursUsed} hour${hoursUsed !== 1 ? 's' : ''}</p>
          </div>
          <div style="background-color: #f0f9ff; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Credits remaining:</strong> ${creditsRemaining} hour${creditsRemaining !== 1 ? 's' : ''}</p>
          </div>
          <p style="text-align: center; margin-top: 20px;">
            <a href="https://learn2lead.page/dashboard" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
          </p>
          <p style="margin-top: 24px; font-size: 12px; color: #888;">This is an automated notification from Learn2Lead.</p>
        </div>`,
    });
    logStep("Completion email sent", { to: studentEmail });
  } catch (e) {
    logStep("WARNING: Failed to send completion email", { error: String(e) });
  }
}

/** Send low credit warning email to student */
async function sendLowCreditWarning(
  studentEmail: string,
  studentName: string,
  creditsRemaining: number
) {
  try {
    await resend.emails.send({
      from: "Learn2Lead <noreply@learn2lead.com>",
      to: studentEmail,
      subject: `⚠️ Low Credit Balance: ${creditsRemaining} hour${creditsRemaining !== 1 ? 's' : ''} remaining`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #ef4444;">⚠️ Low Credit Balance</h2>
          <p>Hello ${studentName},</p>
          <p>Your tutoring credit balance is running low.</p>
          <div style="background-color: #fef2f2; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; font-size: 20px; font-weight: bold;">${creditsRemaining} hour${creditsRemaining !== 1 ? 's' : ''} remaining</p>
          </div>
          <p>To ensure uninterrupted tutoring, please purchase more hours:</p>
          <p style="text-align: center; margin-top: 16px;">
            <a href="https://learn2lead.page/pricing" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Purchase More Hours</a>
          </p>
          <p style="margin-top: 24px; font-size: 12px; color: #888;">This is an automated notification from Learn2Lead.</p>
        </div>`,
    });
    logStep("Low credit warning sent", { to: studentEmail, remaining: creditsRemaining });
  } catch (e) {
    logStep("WARNING: Failed to send low credit email", { error: String(e) });
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Rate limit: 20 deductions per 10 minutes per user
  const rlKey = getRateLimitKey(req, 'deduct-credit');
  const rl = checkRateLimit(rlKey, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
  if (rl.limited) {
    logStep("Rate limited", { key: rlKey });
    return rateLimitResponse(rl.retryAfterMs!, corsHeaders);
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

    // ── Fire-and-forget notification emails ──
    // Get student profile for email notifications
    const studentProfilePromise = supabaseClient
      .from("profiles")
      .select("email, first_name, last_name, notify_low_credits")
      .eq("id", student_id)
      .single();

    // Get tutor name for completion email
    const tutorProfilePromise = supabaseClient
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", userData.user.id)
      .single();

    const [studentProfileRes, tutorProfileRes] = await Promise.all([studentProfilePromise, tutorProfilePromise]);

    if (studentProfileRes.data) {
      const sp = studentProfileRes.data;
      const studentName = `${sp.first_name || ""} ${sp.last_name || ""}`.trim() || "Student";
      const tutorName = tutorProfileRes.data
        ? `${tutorProfileRes.data.first_name || ""} ${tutorProfileRes.data.last_name || ""}`.trim() || tutorProfileRes.data.email
        : "Your tutor";

      // Get the class subject from scheduled_classes before it's deleted
      const subject = class_title; // Use class_title as fallback

      // Send completion summary email (fire-and-forget)
      sendCompletionEmail(sp.email, studentName, class_title, subject, creditsToDeduct, newBalance, tutorName);

      // Send low credit warning if balance <= 2 hours and user has notifications enabled
      if (newBalance <= 2 && sp.notify_low_credits !== false) {
        // Check if we already sent a warning recently (within 7 days) to avoid spam
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentWarning } = await supabaseClient
          .from("overdraw_reminders_sent")
          .select("id")
          .eq("student_id", student_id)
          .gte("sent_at", sevenDaysAgo.toISOString())
          .limit(1);

        if (!recentWarning || recentWarning.length === 0) {
          sendLowCreditWarning(sp.email, studentName, newBalance);

          // Log the warning to prevent spam
          await supabaseClient.from("overdraw_reminders_sent").insert({
            student_id,
            threshold: 2,
            amount_owed: 0,
          });
        } else {
          logStep("Low credit warning already sent recently, skipping");
        }
      }
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
