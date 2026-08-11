import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

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

    // Email to tutor
    const tutorEmail = resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.com>',
      to: [tutor.email],
      subject: `New Student Assigned: ${studentName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#2D46B9;">You Have a New Student</h2>
          <p>Hi ${tutorName},</p>
          <p>A new student has been assigned to you on Learn2Lead.</p>
          <div style="background:#EBF1FF;border:1px solid #c7d4f8;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-size:18px;font-weight:bold;">${studentName}</p>
            <p style="margin:6px 0 0;color:#555;font-size:14px;">${student.email}</p>
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

    // Email to student
    const studentEmail = resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.com>',
      to: [student.email],
      subject: `Meet Your Tutor: ${tutorName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#2D46B9;">Your Tutor Is Ready!</h2>
          <p>Hi ${studentName},</p>
          <p>Great news — you've been paired with a tutor on Learn2Lead.</p>
          <div style="background:#EBF1FF;border:1px solid #c7d4f8;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-size:18px;font-weight:bold;">${tutorName}</p>
            <p style="margin:6px 0 0;color:#555;font-size:14px;">Your Learn2Lead Tutor</p>
          </div>
          <p>You can now log in to your dashboard to view your upcoming sessions and class history.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://learn2lead.page/dashboard"
               style="background:#2D46B9;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Open Dashboard
            </a>
          </div>
          <p><strong>The Learn2Lead Team</strong></p>
        </div>`,
    });

    await Promise.allSettled([tutorEmail, studentEmail]);
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
