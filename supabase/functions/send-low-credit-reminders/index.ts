// Deno.serve is built-in, no import needed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LOW-CREDIT-REMINDER] ${step}${detailsStr}`);
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
    logStep("Function started - checking for low credit subscriptions");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      logStep("WARNING: RESEND_API_KEY not configured - emails will not be sent");
    }

    // Find active subscriptions with low credits (3 or fewer)
    const { data: lowCreditSubs, error: subsError } = await supabaseClient
      .from("student_subscriptions")
      .select(`
        id,
        student_id,
        credits_remaining,
        current_period_end,
        profiles!student_subscriptions_student_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .in("status", ["active", "trialing"])
      .lte("credits_remaining", 3)
      .gte("credits_remaining", 0);

    if (subsError) {
      logStep("ERROR querying subscriptions", { error: subsError });
      throw subsError;
    }

    if (!lowCreditSubs || lowCreditSubs.length === 0) {
      logStep("No low credit subscriptions found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No students need low credit reminders",
          count: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep(`Found ${lowCreditSubs.length} students with low credits`);

    // Send notifications
    const results = [];
    const resend = resendKey ? new Resend(resendKey) : null;

    for (const sub of lowCreditSubs) {
      const profile = sub.profiles as any;
      const email = profile?.email;
      const firstName = profile?.first_name || "Student";
      const credits = sub.credits_remaining;

      if (!email) {
        logStep("Skipping - no email", { student_id: sub.student_id });
        continue;
      }

      // Create in-app notification
      const { error: notifError } = await supabaseClient
        .from("notifications")
        .insert({
          user_id: sub.student_id,
          type: "low_credits",
          message: credits === 0 
            ? "You've used all your classes this period. Purchase more to continue!"
            : `You have ${credits} ${credits === 1 ? 'class' : 'classes'} remaining. Consider upgrading your plan!`,
          read: false
        });

      if (notifError) {
        logStep("ERROR creating notification", { error: notifError });
      } else {
        logStep("Created in-app notification", { student_id: sub.student_id, credits });
      }

      // Send email if Resend is configured
      if (resend) {
        try {
          const emailSubject = credits === 0 
            ? "No Classes Remaining - Time to Renew!"
            : "Running Low on Classes";

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Hi ${firstName}!</h1>
              
              ${credits === 0 ? `
                <p style="color: #dc2626; font-size: 16px; font-weight: bold;">
                  You've used all your classes for this billing period.
                </p>
                <p>Don't let your learning momentum stop! Purchase more classes to continue your educational journey.</p>
              ` : `
                <p style="color: #f59e0b; font-size: 16px; font-weight: bold;">
                  You have ${credits} ${credits === 1 ? 'class' : 'classes'} remaining.
                </p>
                <p>You're running low on classes. Consider upgrading your plan to ensure uninterrupted learning!</p>
              `}
              
              <div style="margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://yourapp.lovable.app'}/pricing" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Plans & Upgrade
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Your current period ends on ${new Date(sub.current_period_end).toLocaleDateString()}.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px;">
                You're receiving this email because your class credits are running low. 
                Manage your subscription anytime from your dashboard.
              </p>
            </div>
          `;

          const emailResponse = await resend.emails.send({
            from: "Learn2Lead <onboarding@resend.dev>",
            to: [email],
            subject: emailSubject,
            html: emailHtml,
          });

          logStep("Email sent", { email, response: emailResponse });
          results.push({ email, credits, email_sent: true });
        } catch (emailError) {
          logStep("ERROR sending email", { email, error: emailError });
          results.push({ email, credits, email_sent: false, error: String(emailError) });
        }
      } else {
        results.push({ email, credits, email_sent: false, reason: "RESEND_API_KEY not configured" });
      }
    }

    logStep("Processing complete", { total_processed: results.length });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} low credit notifications`,
        count: results.length,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
