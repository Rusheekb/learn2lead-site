import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLASS-REMINDER] ${step}${detailsStr}`);
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface ScheduledClass {
  class_id: string;
  title: string;
  subject: string;
  class_date: string; // DATE as ISO string e.g. "2026-07-03"
  class_start: string; // TIME e.g. "14:00:00"
  student_name: string;
  student_email: string;
  tutor_name: string;
  tutor_email: string;
  zoom_link: string | null;
  student_notify_reminders: boolean;
  tutor_notify_reminders: boolean;
}

function formatClassTime(timeStr: string): string {
  // timeStr = "14:00:00"
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm} CST`;
}

function formatClassDate(dateStr: string): string {
  // dateStr = "2026-07-03" — parse as local date to avoid UTC-shift
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

async function sendStudentReminder(cls: ScheduledClass): Promise<void> {
  const dateStr = formatClassDate(cls.class_date);
  const timeStr = formatClassTime(cls.class_start);

  const zoomSection = cls.zoom_link
    ? `<p style="text-align:center;margin:16px 0;">
         <a href="${cls.zoom_link}"
            style="background:#6366f1;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
           Join Zoom Meeting
         </a>
       </p>`
    : '';

  await resend.emails.send({
    from: 'Learn2Lead <noreply@learn2lead.com>',
    to: cls.student_email,
    subject: `Reminder: ${cls.subject} session tomorrow at ${timeStr}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eaeaea;border-radius:8px;">
        <h2 style="color:#1a1a2e;">📚 Class Reminder</h2>
        <p>Hi ${cls.student_name},</p>
        <p>Just a reminder that you have a tutoring session <strong>tomorrow</strong>:</p>
        <div style="background:#f8f9fa;padding:16px;border-radius:6px;border-left:4px solid #6366f1;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Subject:</strong> ${cls.subject}</p>
          <p style="margin:4px 0;"><strong>Tutor:</strong> ${cls.tutor_name}</p>
          <p style="margin:4px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin:4px 0;"><strong>Time:</strong> ${timeStr}</p>
        </div>
        ${zoomSection}
        <p style="margin-top:16px;font-size:14px;color:#666;">
          Need to reschedule? Contact your admin as soon as possible.
        </p>
        <p style="margin-top:24px;font-size:12px;color:#888;text-align:center;">
          Learn2Lead · Automated reminder
        </p>
      </div>`,
  });
}

async function sendTutorReminder(cls: ScheduledClass): Promise<void> {
  const dateStr = formatClassDate(cls.class_date);
  const timeStr = formatClassTime(cls.class_start);

  await resend.emails.send({
    from: 'Learn2Lead <noreply@learn2lead.com>',
    to: cls.tutor_email,
    subject: `Reminder: session with ${cls.student_name} tomorrow at ${timeStr}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eaeaea;border-radius:8px;">
        <h2 style="color:#1a1a2e;">📅 Session Reminder</h2>
        <p>Hi ${cls.tutor_name},</p>
        <p>You have a tutoring session <strong>tomorrow</strong>:</p>
        <div style="background:#f8f9fa;padding:16px;border-radius:6px;border-left:4px solid #22c55e;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Student:</strong> ${cls.student_name}</p>
          <p style="margin:4px 0;"><strong>Subject:</strong> ${cls.subject}</p>
          <p style="margin:4px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin:4px 0;"><strong>Time:</strong> ${timeStr}</p>
        </div>
        <p style="margin-top:16px;font-size:14px;color:#666;">
          Please log into the dashboard to complete the session when it's done.
        </p>
        <p style="margin-top:24px;font-size:12px;color:#888;text-align:center;">
          Learn2Lead · Automated reminder
        </p>
      </div>`,
  });
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const rlKey = getRateLimitKey(req, 'class-reminder');
  const rl = checkRateLimit(rlKey, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs!, corsHeaders);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep('Fetching tomorrow classes');

    const { data, error } = await supabase.rpc(
      'get_tomorrow_scheduled_classes'
    );
    if (error) throw new Error(`RPC failed: ${error.message}`);

    const classes = (data ?? []) as ScheduledClass[];
    logStep('Classes found', { count: classes.length });

    if (classes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: 'No classes tomorrow',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const cls of classes) {
      try {
        const sends: Promise<void>[] = [];
        if (cls.student_notify_reminders !== false)
          sends.push(sendStudentReminder(cls));
        if (cls.tutor_notify_reminders !== false)
          sends.push(sendTutorReminder(cls));
        await Promise.all(sends);
        sent += sends.length;

        // Mark reminder sent so re-runs of the cron don't duplicate
        await supabase
          .from('scheduled_classes')
          .update({ reminder_24h_sent: true })
          .eq('id', cls.class_id);

        logStep('Reminders sent', {
          class_id: cls.class_id,
          student: cls.student_email,
        });
      } catch (e) {
        const msg = String(e);
        errors.push(`${cls.class_id}: ${msg}`);
        logStep('Failed to send reminder', {
          class_id: cls.class_id,
          error: msg,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, classes: classes.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
