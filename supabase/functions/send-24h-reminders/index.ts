import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { Resend } from "npm:resend@2.0.0";
import { getRateLimitKey, checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[24H-REMINDERS] ${step}${detailsStr}`);
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const formatTime12h = (time24: string): string => {
  const [hour, minute] = time24.split(":");
  const h = parseInt(hour, 10);
  return `${h % 12 || 12}:${minute} ${h >= 12 ? "PM" : "AM"}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting 24h reminder check");

    // Get tomorrow's date in YYYY-MM-DD
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    logStep("Checking classes for date", { date: tomorrowStr });

    // Find classes happening tomorrow that haven't received a 24h reminder
    const { data: classes, error: queryError } = await supabase
      .from("scheduled_classes")
      .select("id, title, date, start_time, end_time, zoom_link, subject, tutor_id, student_id")
      .eq("date", tomorrowStr)
      .eq("reminder_24h_sent", false)
      .eq("status", "scheduled");

    if (queryError) throw new Error(`Query failed: ${queryError.message}`);

    logStep("Found classes needing 24h reminders", { count: classes?.length ?? 0 });

    let emailsSent = 0;

    for (const cls of classes ?? []) {
      // Get tutor and student profiles
      const [tutorRes, studentRes] = await Promise.all([
        supabase.from("profiles").select("email, first_name, last_name, notify_class_reminders").eq("id", cls.tutor_id).single(),
        supabase.from("profiles").select("email, first_name, last_name, notify_class_reminders").eq("id", cls.student_id).single(),
      ]);

      const tutor = tutorRes.data;
      const student = studentRes.data;

      if (!tutor || !student) {
        logStep("Skipping class - missing profile data", { classId: cls.id });
        continue;
      }

      const tutorName = `${tutor.first_name || ""} ${tutor.last_name || ""}`.trim() || tutor.email;
      const studentName = `${student.first_name || ""} ${student.last_name || ""}`.trim() || student.email;
      const formattedDate = new Date(cls.date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const startTime = formatTime12h(cls.start_time);
      const endTime = formatTime12h(cls.end_time);

      const buildEmailHtml = (recipientName: string, role: "tutor" | "student") => {
        const otherPerson = role === "tutor" ? `Student: ${studentName}` : `Tutor: ${tutorName}`;
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #1a1a2e;">📅 Class Tomorrow</h2>
            <p>Hello ${recipientName},</p>
            <p>Just a reminder — you have a class scheduled for <strong>tomorrow</strong>:</p>
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #6366f1;">
              <p style="margin: 4px 0;"><strong>Class:</strong> ${cls.title}</p>
              <p style="margin: 4px 0;"><strong>Subject:</strong> ${cls.subject}</p>
              <p style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime} CST</p>
              <p style="margin: 4px 0;"><strong>${otherPerson}</strong></p>
            </div>
            ${cls.zoom_link ? `<p><a href="${cls.zoom_link}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Zoom Meeting</a></p>` : ""}
            <p style="margin-top: 24px; font-size: 12px; color: #888;">This is an automated reminder from Learn2Lead. Please do not reply to this email.</p>
          </div>`;
      };

      // Send to tutor if they have notifications enabled
      if (tutor.notify_class_reminders !== false) {
        try {
          await resend.emails.send({
            from: "Learn2Lead <noreply@learn2lead.com>",
            to: tutor.email,
            subject: `Tomorrow: ${cls.title} with ${studentName}`,
            html: buildEmailHtml(tutorName, "tutor"),
          });
          emailsSent++;
        } catch (e) {
          logStep("Failed to email tutor", { email: tutor.email, error: String(e) });
        }
      }

      // Send to student if they have notifications enabled
      if (student.notify_class_reminders !== false) {
        try {
          await resend.emails.send({
            from: "Learn2Lead <noreply@learn2lead.com>",
            to: student.email,
            subject: `Tomorrow: ${cls.title} with ${tutorName}`,
            html: buildEmailHtml(studentName, "student"),
          });
          emailsSent++;
        } catch (e) {
          logStep("Failed to email student", { email: student.email, error: String(e) });
        }
      }

      // Mark as sent
      await supabase
        .from("scheduled_classes")
        .update({ reminder_24h_sent: true })
        .eq("id", cls.id);
    }

    logStep("Completed", { classesProcessed: classes?.length ?? 0, emailsSent });

    return new Response(
      JSON.stringify({ success: true, classes_processed: classes?.length ?? 0, emails_sent: emailsSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("ERROR", { message: String(error) });
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
