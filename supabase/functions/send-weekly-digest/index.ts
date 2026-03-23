import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { Resend } from "npm:resend@2.0.0";
import { getRateLimitKey, checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[WEEKLY-DIGEST] ${step}${detailsStr}`);
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
    logStep("Starting weekly digest");

    // Get all students with active profiles
    const { data: students, error: studentsError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("role", "student");

    if (studentsError) throw new Error(`Failed to fetch students: ${studentsError.message}`);

    logStep("Found students", { count: students?.length ?? 0 });

    // Date range: next 7 days
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split("T")[0];
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    // Also get last week range for completed classes summary
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split("T")[0];

    let emailsSent = 0;

    for (const student of students ?? []) {
      const studentName = `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student";

      // Get upcoming classes for this student
      const { data: upcomingClasses } = await supabase
        .from("scheduled_classes")
        .select("title, date, start_time, end_time, subject")
        .eq("student_id", student.id)
        .eq("status", "scheduled")
        .gte("date", todayStr)
        .lte("date", nextWeekStr)
        .order("date")
        .order("start_time");

      // Get completed classes from last week
      const { data: completedLogs } = await supabase
        .from("class_logs")
        .select('"Subject", "Time (hrs)", "Tutor Name", "Date"')
        .eq("student_user_id", student.id)
        .gte("Date", lastWeekStr)
        .lt("Date", todayStr);

      // Get credit balance
      const { data: balance } = await supabase
        .rpc("get_student_credit_balance", { p_student_id: student.id });

      const creditBalance = balance ?? 0;

      // Skip students with no activity and no upcoming classes
      if ((!upcomingClasses || upcomingClasses.length === 0) && 
          (!completedLogs || completedLogs.length === 0)) {
        continue;
      }

      // Build upcoming classes HTML
      let upcomingHtml = "";
      if (upcomingClasses && upcomingClasses.length > 0) {
        const rows = upcomingClasses.map((cls) => {
          const date = new Date(cls.date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatTime12h(cls.start_time)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cls.subject}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cls.title}</td>
          </tr>`;
        }).join("");

        upcomingHtml = `
          <h3 style="color: #1a1a2e; margin-top: 24px;">📅 Upcoming Classes (Next 7 Days)</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; text-align: left;">Date</th>
                <th style="padding: 8px; text-align: left;">Time</th>
                <th style="padding: 8px; text-align: left;">Subject</th>
                <th style="padding: 8px; text-align: left;">Class</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`;
      } else {
        upcomingHtml = `<p style="color: #666; margin-top: 16px;">No upcoming classes scheduled for the next 7 days.</p>`;
      }

      // Build completed classes summary
      let completedHtml = "";
      if (completedLogs && completedLogs.length > 0) {
        const totalHours = completedLogs.reduce((sum, log) => {
          const hrs = parseFloat(log["Time (hrs)"] || "0");
          return sum + (isNaN(hrs) ? 0 : hrs);
        }, 0);

        const subjects = [...new Set(completedLogs.map((l) => l["Subject"]).filter(Boolean))];

        completedHtml = `
          <h3 style="color: #1a1a2e; margin-top: 24px;">✅ Last Week's Summary</h3>
          <div style="background: #f0fdf4; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #22c55e;">
            <p style="margin: 4px 0;"><strong>${completedLogs.length}</strong> class${completedLogs.length !== 1 ? "es" : ""} completed</p>
            <p style="margin: 4px 0;"><strong>${totalHours.toFixed(1)}</strong> hours of tutoring</p>
            <p style="margin: 4px 0;">Subjects: ${subjects.join(", ") || "—"}</p>
          </div>`;
      }

      // Credit balance section
      const creditColor = creditBalance <= 2 ? "#ef4444" : creditBalance <= 4 ? "#f59e0b" : "#22c55e";
      const creditHtml = `
        <h3 style="color: #1a1a2e; margin-top: 24px;">💰 Credit Balance</h3>
        <div style="background: #f8f9fa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid ${creditColor};">
          <p style="margin: 0; font-size: 18px;"><strong>${creditBalance}</strong> hour${creditBalance !== 1 ? "s" : ""} remaining</p>
          ${creditBalance <= 2 ? `<p style="margin: 4px 0; color: #ef4444; font-size: 13px;">⚠️ Low balance — <a href="https://learn2lead.page/pricing" style="color: #6366f1;">purchase more hours</a></p>` : ""}
        </div>`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a2e;">📬 Your Weekly Learn2Lead Digest</h2>
          <p>Hello ${studentName},</p>
          <p>Here's your weekly summary for the week of ${today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}:</p>
          ${completedHtml}
          ${upcomingHtml}
          ${creditHtml}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="text-align: center;">
            <a href="https://learn2lead.page/dashboard" style="background-color: #6366f1; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
          </p>
          <p style="margin-top: 24px; font-size: 12px; color: #888; text-align: center;">
            This is an automated weekly digest from Learn2Lead. Please do not reply to this email.
          </p>
        </div>`;

      try {
        await resend.emails.send({
          from: "Learn2Lead <noreply@learn2lead.com>",
          to: student.email,
          subject: `Your Weekly Learn2Lead Digest — ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          html,
        });
        emailsSent++;
      } catch (e) {
        logStep("Failed to send digest", { email: student.email, error: String(e) });
      }
    }

    logStep("Completed", { studentsProcessed: students?.length ?? 0, emailsSent });

    return new Response(
      JSON.stringify({ success: true, students_processed: students?.length ?? 0, emails_sent: emailsSent }),
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
