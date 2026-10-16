import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { audienceFor, isSendableEmail } from '../_shared/recipients.ts';
import { getTargetsForStudent, NotifyTarget } from '../_shared/notify.ts';
import { makeSenders } from '../_shared/senders.ts';
import { tutorAssignedText } from '../_shared/smsTexts.ts';

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[NOTIFY-ASSIGNMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const rateLimitKey = getRateLimitKey(req, 'notify-assignment');
  const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return rateLimitResponse(retryAfterMs!, corsHeaders);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Only admins create tutor assignments (RLS enforces it), so only an
    // admin may announce one. This used to accept any Authorization header —
    // anyone with the public anon key could email any student and tutor.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const { data: caller } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    const { data: callerProfile } = caller?.user
      ? await supabase
          .from('profiles')
          .select('role')
          .eq('id', caller.user.id)
          .maybeSingle()
      : { data: null };
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { tutor_profile_id, student_profile_id } = await req.json();
    if (!tutor_profile_id || !student_profile_id) {
      throw new Error('tutor_profile_id and student_profile_id are required');
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      logStep('RESEND_API_KEY not set — skipping emails');
      return new Response(
        JSON.stringify({ sent: false, reason: 'no_api_key' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Fetch both profiles
    const [tutorRes, studentRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', tutor_profile_id)
        .single(),
      supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', student_profile_id)
        .single(),
    ]);

    const tutor = tutorRes.data;
    const student = studentRes.data;

    if (!tutor || !student) {
      logStep('Could not fetch profiles, skipping', {
        tutor_profile_id,
        student_profile_id,
      });
      return new Response(
        JSON.stringify({ sent: false, reason: 'profiles_not_found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const tutorName =
      [tutor.first_name, tutor.last_name].filter(Boolean).join(' ') ||
      tutor.email;
    const studentName =
      [student.first_name, student.last_name].filter(Boolean).join(' ') ||
      student.email;
    const resend = new Resend(resendApiKey);

    // The student (at a real address) and their parent. Without a parent,
    // just the student, as before.
    const self: NotifyTarget = {
      user_id: student_profile_id,
      email: student.email,
      phone: null,
      first_name: student.first_name,
      last_name: student.last_name,
      timezone: null,
      is_guardian: false,
      email_enabled: true,
      sms_enabled: false,
    };
    const targets = await getTargetsForStudent(
      supabase,
      student_profile_id,
      'class_updates'
    ).catch((e) => {
      logStep('WARNING: recipient lookup failed, student only', {
        error: String(e),
      });
      return [self];
    });
    // Texts for whoever turned them on.
    const senders = makeSenders();
    for (const r of targets) {
      if (r.sms_enabled && r.phone) {
        await senders.sendSms(
          r.phone,
          tutorAssignedText({
            isGuardian: r.is_guardian,
            studentFirstName: student.first_name || '',
            tutorName,
          })
        );
      }
    }
    const studentSide = targets.filter(
      (r) => r.email_enabled && isSendableEmail(r.email)
    );
    // The tutor's "contact" line: the parent for a child, else the student.
    const familyContact =
      studentSide.find((r) => r.is_guardian)?.email ||
      (isSendableEmail(student.email) ? student.email : '');

    // Email to tutor
    const tutorEmail = resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.page>',
      to: [tutor.email],
      subject: `New Student Assigned: ${studentName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#2D46B9;">You Have a New Student</h2>
          <p>Hi ${tutorName},</p>
          <p>A new student has been assigned to you on Learn2Lead.</p>
          <div style="background:#EBF1FF;border:1px solid #c7d4f8;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-size:18px;font-weight:bold;">${studentName}</p>
            <p style="margin:6px 0 0;color:#555;font-size:14px;">${familyContact}</p>
          </div>
          <p>Log in to your dashboard to view your student's profile and schedule your first session.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://learn2lead.page/tutor-dashboard"
               style="background:#2D46B9;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Open Dashboard
            </a>
          </div>
          <p><strong>The Learn2Lead Team</strong></p>
        </div>`,
    });

    // Email to the student and/or their parent
    const studentEmails = studentSide.map((r) => {
      const greeting = r.is_guardian
        ? audienceFor(r, student.first_name).greetingName
        : studentName;
      const who = r.is_guardian ? student.first_name || 'Your child' : 'you';
      return resend.emails.send({
        from: 'Learn2Lead <noreply@learn2lead.page>',
        to: [r.email!],
        subject: r.is_guardian
          ? `Meet ${student.first_name ? `${student.first_name}'s` : 'Your'} Tutor: ${tutorName}`
          : `Meet Your Tutor: ${tutorName}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#2D46B9;">${r.is_guardian ? 'A Tutor Is Ready!' : 'Your Tutor Is Ready!'}</h2>
          <p>Hi ${greeting},</p>
          <p>Great news — ${r.is_guardian ? `${who} has` : "you've"} been paired with a tutor on Learn2Lead.</p>
          <div style="background:#EBF1FF;border:1px solid #c7d4f8;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-size:18px;font-weight:bold;">${tutorName}</p>
            <p style="margin:6px 0 0;color:#555;font-size:14px;">${r.is_guardian ? `${who}'s` : 'Your'} Learn2Lead Tutor</p>
          </div>
          <p>You can now log in to your dashboard to view ${r.is_guardian ? 'upcoming sessions and class history' : 'your upcoming sessions and class history'}.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://learn2lead.page/${r.is_guardian ? 'family' : 'dashboard'}"
               style="background:#2D46B9;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Open Dashboard
            </a>
          </div>
          <p><strong>The Learn2Lead Team</strong></p>
        </div>`,
      });
    });

    await Promise.allSettled([tutorEmail, ...studentEmails]);
    logStep('Assignment notification emails sent', { tutorName, studentName });

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
