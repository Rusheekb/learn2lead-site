import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { Resend } from 'npm:resend@2.0.0';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { requireCronSecret } from '../_shared/cronAuth.ts';
import { buildDigestCreditSection } from '../_shared/creditEmails.ts';

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEEKLY-DIGEST] ${step}${detailsStr}`);
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const formatTime12h = (time24: string): string => {
  const [hour, minute] = time24.split(':');
  const h = parseInt(hour, 10);
  return `${h % 12 || 12}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Cron-only endpoint: reject anything without the shared cron secret.
  const unauthorized = requireCronSecret(
    req,
    corsHeaders,
    Deno.env.get('CRON_SECRET')
  );
  if (unauthorized) return unauthorized;

  const rateLimitKey = getRateLimitKey(req, 'send-weekly-digest');
  const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (limited) return rateLimitResponse(retryAfterMs!, corsHeaders);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // dry_run: compute every digest without sending, logging each balance
  // server-side only (this endpoint has no caller auth, so the response
  // never includes per-family data).
  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;

  try {
    logStep('Starting weekly digest', { dryRun });

    // Get all students with active profiles who have reminders enabled
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, notify_class_reminders')
      .eq('role', 'student')
      .neq('notify_class_reminders', false);

    if (studentsError)
      throw new Error(`Failed to fetch students: ${studentsError.message}`);

    logStep('Found students', { count: students?.length ?? 0 });

    // Date range: next 7 days
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Also get last week range for completed classes summary
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];

    let emailsSent = 0;

    for (const student of students ?? []) {
      const studentName =
        `${student.first_name || ''} ${student.last_name || ''}`.trim() ||
        'Student';

      // Get upcoming classes for this student
      const { data: upcomingClasses } = await supabase
        .from('scheduled_classes')
        .select('title, date, start_time, end_time, subject')
        .eq('student_id', student.id)
        .eq('status', 'scheduled')
        .gte('date', todayStr)
        .lte('date', nextWeekStr)
        .order('date')
        .order('start_time');

      // Get completed classes from last week
      const { data: completedLogs } = await supabase
        .from('class_logs')
        .select('"Subject", "Time (hrs)", "Tutor Name", "Date"')
        .eq('student_user_id', student.id)
        .gte('Date', lastWeekStr)
        .lt('Date', todayStr);

      // Read the balance straight from the subscription row — the same balance
      // class logging debits. This used to call get_student_credit_balance,
      // which since the Aug 28 RPC lockdown only answers for the student,
      // their tutor, or an admin; this job has no user, so every call raised,
      // the error was ignored, and `?? 0` told every family they had 0 hours.
      // null = couldn't read it, and the digest then omits the section.
      const { data: sub, error: subError } = await supabase
        .from('student_subscriptions')
        .select('credits_remaining')
        .eq('student_id', student.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let creditBalance: number | null;
      if (subError) {
        logStep('WARNING: balance lookup failed, omitting balance section', {
          studentId: student.id,
          error: subError.message,
        });
        creditBalance = null;
      } else {
        // No subscription row means no hours were ever purchased.
        creditBalance = sub ? Number(sub.credits_remaining) : 0;
      }

      // Skip students with no activity and no upcoming classes
      if (
        (!upcomingClasses || upcomingClasses.length === 0) &&
        (!completedLogs || completedLogs.length === 0)
      ) {
        continue;
      }

      // Build upcoming classes HTML
      let upcomingHtml = '';
      if (upcomingClasses && upcomingClasses.length > 0) {
        const rows = upcomingClasses
          .map((cls) => {
            const date = new Date(cls.date + 'T12:00:00').toLocaleDateString(
              'en-US',
              {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }
            );
            return `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatTime12h(cls.start_time)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cls.subject}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cls.title}</td>
          </tr>`;
          })
          .join('');

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
      let completedHtml = '';
      if (completedLogs && completedLogs.length > 0) {
        const totalHours = completedLogs.reduce((sum, log) => {
          const hrs = parseFloat(log['Time (hrs)'] || '0');
          return sum + (isNaN(hrs) ? 0 : hrs);
        }, 0);

        const subjects = [
          ...new Set(completedLogs.map((l) => l['Subject']).filter(Boolean)),
        ];

        completedHtml = `
          <h3 style="color: #1a1a2e; margin-top: 24px;">✅ Last Week's Summary</h3>
          <div style="background: #f0fdf4; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #22c55e;">
            <p style="margin: 4px 0;"><strong>${completedLogs.length}</strong> class${completedLogs.length !== 1 ? 'es' : ''} completed</p>
            <p style="margin: 4px 0;"><strong>${totalHours.toFixed(1)}</strong> hours of tutoring</p>
            <p style="margin: 4px 0;">Subjects: ${subjects.join(', ') || '—'}</p>
          </div>`;
      }

      const creditHtml = buildDigestCreditSection(creditBalance);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a2e;">📬 Your Weekly Learn2Lead Digest</h2>
          <p>Hello ${studentName},</p>
          <p>Here's your weekly summary for the week of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}:</p>
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

      if (dryRun) {
        logStep('DRY RUN: would send digest', {
          studentId: student.id,
          creditBalance,
          upcoming: upcomingClasses?.length ?? 0,
          completed: completedLogs?.length ?? 0,
        });
        emailsSent++;
        continue;
      }

      try {
        await resend.emails.send({
          from: 'Learn2Lead <noreply@learn2lead.page>',
          to: student.email,
          subject: `Your Weekly Learn2Lead Digest — ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          html,
        });
        emailsSent++;
      } catch (e) {
        logStep('Failed to send digest', {
          email: student.email,
          error: String(e),
        });
      }
    }

    logStep('Completed', {
      studentsProcessed: students?.length ?? 0,
      emailsSent,
      dryRun,
    });

    return new Response(
      JSON.stringify({
        success: true,
        students_processed: students?.length ?? 0,
        emails_sent: emailsSent,
        dry_run: dryRun,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
