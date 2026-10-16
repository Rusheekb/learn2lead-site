import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { requireCronSecret } from '../_shared/cronAuth.ts';
import { formatDateInZone, formatTimeInZone } from '../_shared/timeFormat.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { audienceFor, isSendableEmail } from '../_shared/recipients.ts';
import {
  getTargetForProfile,
  getTargetsForStudent,
} from '../_shared/notify.ts';
import { makeSenders } from '../_shared/senders.ts';
import { reminderText, tutorReminderText } from '../_shared/smsTexts.ts';

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
  class_start: string; // TIME e.g. "14:00:00" (Central)
  start_at: string; // exact start (ISO)
  end_at: string;
  student_timezone: string | null;
  tutor_timezone: string | null;
  student_name: string;
  student_email: string;
  tutor_name: string;
  tutor_email: string;
  zoom_link: string | null;
  student_notify_reminders: boolean;
  tutor_notify_reminders: boolean;
  student_id?: string;
  tutor_id?: string;
}

/** One person getting the student-side reminder: the student or their parent. */
interface StudentSideRecipient {
  email: string | null;
  emailOn: boolean;
  phone: string | null;
  smsOn: boolean;
  timezone: string | null;
  greetingName: string;
  isGuardian: boolean;
  studentFirstName: string;
}

const senders = makeSenders();

// Each recipient sees the class in their own time zone (profiles.timezone,
// falling back to Central), with a DST-correct label — this used to append a
// hardcoded "CST" to the Central clock time for everyone.
const timeFor = (cls: ScheduledClass, tz: string | null) =>
  formatTimeInZone(cls.start_at, tz ?? '');
const dateFor = (cls: ScheduledClass, tz: string | null) =>
  formatDateInZone(cls.start_at, tz ?? '');

async function sendStudentReminder(
  cls: ScheduledClass,
  to: StudentSideRecipient & { email: string }
): Promise<void> {
  const dateStr = dateFor(cls, to.timezone);
  const timeStr = timeFor(cls, to.timezone);
  // A parent reads "Maya has a tutoring session"; the student reads "you have".
  const who = to.isGuardian ? to.studentFirstName || 'Your child' : 'you';
  const has = to.isGuardian ? 'has' : 'have';
  const subjectLine = to.isGuardian
    ? `Reminder: ${to.studentFirstName ? `${to.studentFirstName}'s ` : ''}${cls.subject} session tomorrow at ${timeStr}`
    : `Reminder: ${cls.subject} session tomorrow at ${timeStr}`;

  const zoomSection = cls.zoom_link
    ? `<p style="text-align:center;margin:16px 0;">
         <a href="${cls.zoom_link}"
            style="background:#6366f1;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
           Join Zoom Meeting
         </a>
       </p>`
    : '';

  await resend.emails.send({
    from: 'Learn2Lead <noreply@learn2lead.page>',
    to: to.email,
    subject: subjectLine,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eaeaea;border-radius:8px;">
        <h2 style="color:#1a1a2e;">📚 Class Reminder</h2>
        <p>Hi ${to.greetingName},</p>
        <p>Just a reminder that ${who} ${has} a tutoring session <strong>tomorrow</strong>:</p>
        <div style="background:#f8f9fa;padding:16px;border-radius:6px;border-left:4px solid #6366f1;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Subject:</strong> ${cls.subject}</p>
          <p style="margin:4px 0;"><strong>Tutor:</strong> ${cls.tutor_name}</p>
          <p style="margin:4px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin:4px 0;"><strong>Time:</strong> ${timeStr}</p>
        </div>
        ${zoomSection}
        <p style="margin-top:16px;font-size:14px;color:#666;">
          Need to reschedule? Email us at
          <a href="mailto:learn2leadtutoring@gmail.com" style="color:#6366f1;">learn2leadtutoring@gmail.com</a>
          as soon as possible.
        </p>
        <p style="margin-top:24px;font-size:12px;color:#888;text-align:center;">
          Learn2Lead · Automated reminder
        </p>
      </div>`,
  });
}

async function sendTutorReminder(
  cls: ScheduledClass,
  to = cls.tutor_email
): Promise<void> {
  const dateStr = dateFor(cls, cls.tutor_timezone);
  const timeStr = timeFor(cls, cls.tutor_timezone);

  const zoomSection = cls.zoom_link
    ? `<p style="text-align:center;margin:16px 0;">
         <a href="${cls.zoom_link}"
            style="background:#22c55e;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
           Open Zoom Meeting
         </a>
       </p>`
    : '';

  await resend.emails.send({
    from: 'Learn2Lead <noreply@learn2lead.page>',
    to,
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
        ${zoomSection}
        <p style="margin-top:16px;font-size:14px;color:#666;">
          Please log into the dashboard to complete the session when it's done.
        </p>
        <p style="margin-top:24px;font-size:12px;color:#888;text-align:center;">
          Learn2Lead · Automated reminder
        </p>
      </div>`,
  });
}

/**
 * The student and/or their parent, each with their own time zone and their
 * own choices (email, and texts if they've verified a number). Without a
 * parent this is exactly the student, as before family accounts.
 */
async function studentSideRecipients(
  supabase: any,
  cls: ScheduledClass
): Promise<StudentSideRecipient[]> {
  // The student only — the pre-family-accounts behaviour, used if the class
  // row has no student_id or the recipient lookup fails.
  const studentOnly = (): StudentSideRecipient[] =>
    cls.student_notify_reminders !== false && isSendableEmail(cls.student_email)
      ? [
          {
            email: cls.student_email,
            emailOn: true,
            phone: null,
            smsOn: false,
            timezone: cls.student_timezone,
            greetingName: cls.student_name,
            isGuardian: false,
            studentFirstName: '',
          },
        ]
      : [];

  if (!cls.student_id) return studentOnly();

  let recipients;
  try {
    recipients = await getTargetsForStudent(
      supabase,
      cls.student_id,
      'class_reminders'
    );
  } catch (e) {
    logStep('WARNING: recipient lookup failed, student only', {
      class_id: cls.class_id,
      error: String(e),
    });
    return studentOnly();
  }
  const student = recipients.find((r) => !r.is_guardian);
  const studentFirstName =
    student?.first_name || cls.student_name.split(' ')[0] || '';

  return recipients.map((r) => ({
    email: r.email,
    emailOn: r.email_enabled && isSendableEmail(r.email),
    phone: r.phone,
    smsOn: r.sms_enabled && !!r.phone,
    timezone: r.timezone,
    greetingName: r.is_guardian
      ? audienceFor(r, studentFirstName).greetingName
      : cls.student_name,
    isGuardian: r.is_guardian,
    studentFirstName,
  }));
}

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
        const sends: Promise<unknown>[] = [];
        for (const r of await studentSideRecipients(supabase, cls)) {
          if (r.emailOn && r.email)
            sends.push(sendStudentReminder(cls, { ...r, email: r.email }));
          if (r.smsOn && r.phone)
            sends.push(
              senders.sendSms(
                r.phone,
                reminderText({
                  isGuardian: r.isGuardian,
                  studentFirstName: r.studentFirstName,
                  subject: cls.subject,
                  time: timeFor(cls, r.timezone),
                  tutorName: cls.tutor_name,
                  zoomLink: cls.zoom_link,
                })
              )
            );
        }

        // The tutor, by their own choices too (old setting as the fallback).
        const tutor = cls.tutor_id
          ? await getTargetForProfile(
              supabase,
              cls.tutor_id,
              'class_reminders'
            ).catch(() => null)
          : null;
        const tutorEmailOn = tutor
          ? tutor.email_enabled
          : cls.tutor_notify_reminders !== false;
        if (tutorEmailOn) sends.push(sendTutorReminder(cls));
        if (tutor?.sms_enabled && tutor.phone)
          sends.push(
            senders.sendSms(
              tutor.phone,
              tutorReminderText({
                studentName: cls.student_name,
                subject: cls.subject,
                time: timeFor(cls, cls.tutor_timezone),
              })
            )
          );

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
