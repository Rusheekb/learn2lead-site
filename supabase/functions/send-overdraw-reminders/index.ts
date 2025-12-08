import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (message: string, data?: unknown) => {
  console.log(`[send-overdraw-reminders] ${message}`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting overdraw reminders check");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all students with negative credit balances
    const { data: subscriptions, error: subError } = await supabase
      .from("student_subscriptions")
      .select(`
        id,
        student_id,
        credits_remaining,
        plan_id,
        subscription_plans (
          price_per_class,
          name
        )
      `)
      .lt("credits_remaining", 0)
      .eq("status", "active");

    if (subError) {
      log("Error fetching subscriptions", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      log("No students with negative balances found");
      return new Response(
        JSON.stringify({ message: "No overdraw reminders needed", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log(`Found ${subscriptions.length} students with negative balances`);

    let remindersSent = 0;
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    for (const subscription of subscriptions) {
      const credits = subscription.credits_remaining;
      const absCredits = Math.abs(credits);
      
      // Calculate threshold: -5, -10, -15, -20, etc.
      const threshold = Math.floor(absCredits / 5) * 5;
      
      // Only send at -5 intervals (skip if not at a threshold)
      if (threshold === 0 || absCredits < 5) {
        continue;
      }

      // Check if we already sent a reminder for this threshold
      const { data: existingReminder } = await supabase
        .from("overdraw_reminders_sent")
        .select("id")
        .eq("student_id", subscription.student_id)
        .eq("threshold", threshold)
        .maybeSingle();

      if (existingReminder) {
        log(`Reminder already sent for student ${subscription.student_id} at threshold ${threshold}`);
        continue;
      }

      // Get student profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("id", subscription.student_id)
        .maybeSingle();

      if (profileError || !profile) {
        log(`Could not find profile for student ${subscription.student_id}`, profileError);
        continue;
      }

      // Calculate amount owed
      const pricePerClass = subscription.subscription_plans?.price_per_class || 35;
      const amountOwed = absCredits * pricePerClass;
      const studentName = profile.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : profile.email;

      log(`Processing reminder for ${studentName}: ${credits} credits, $${amountOwed} owed`);

      // Send email if Resend is configured
      if (resend) {
        try {
          await resend.emails.send({
            from: "Learn2Lead <onboarding@resend.dev>",
            to: [profile.email],
            subject: `Payment Reminder: ${absCredits} Classes Outstanding`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc2626;">Payment Reminder</h1>
                <p>Dear ${studentName},</p>
                <p>This is a friendly reminder that your account currently has <strong>${absCredits} classes</strong> that need to be paid for.</p>
                
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 18px;">
                    <strong>Amount Owed: $${amountOwed.toFixed(2)}</strong>
                  </p>
                  <p style="margin: 10px 0 0 0; color: #666;">
                    (${absCredits} classes × $${pricePerClass.toFixed(2)} per class)
                  </p>
                </div>
                
                <p>To continue uninterrupted tutoring services, please arrange payment at your earliest convenience.</p>
                
                <h3>Payment Options:</h3>
                <ul>
                  <li>Zelle payments are accepted</li>
                  <li>Contact us for other payment arrangements</li>
                </ul>
                
                <p>If you have any questions or have already made a payment, please let us know.</p>
                
                <p>Thank you for your continued trust in Learn2Lead!</p>
                
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                  This is an automated reminder. Your classes will continue as scheduled.
                </p>
              </div>
            `,
          });
          log(`Email sent to ${profile.email}`);
        } catch (emailError) {
          log(`Failed to send email to ${profile.email}`, emailError);
        }
      } else {
        log("Resend not configured, skipping email");
      }

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: subscription.student_id,
        message: `Payment reminder: You have ${absCredits} classes outstanding ($${amountOwed.toFixed(2)} owed)`,
        type: "payment_reminder",
      });

      // Record that we sent this reminder
      await supabase.from("overdraw_reminders_sent").insert({
        student_id: subscription.student_id,
        threshold: threshold,
        amount_owed: amountOwed,
      });

      remindersSent++;
    }

    log(`Completed. Sent ${remindersSent} reminders`);

    return new Response(
      JSON.stringify({ 
        message: "Overdraw reminders processed", 
        sent: remindersSent,
        checked: subscriptions.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log("Error in send-overdraw-reminders", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
