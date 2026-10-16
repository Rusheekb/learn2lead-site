import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { buildGuardianInviteEmail } from '../_shared/familyEmails.ts';
import { fullName } from '../_shared/recipients.ts';

/**
 * A student with their own account invites a parent
 * (docs/family-accounts-plan.md, Phase 5b). Creating the invite (and every
 * check on it) happens in create_guardian_invite; this sends the email.
 * When the parent accepts, they take over the student's billing.
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[INVITE-GUARDIAN] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

const ERRORS: Record<string, string> = {
  invalid_email: 'Enter a valid email address.',
  not_eligible: "This account can't invite a parent.",
  own_email: "That's your own email — enter your parent's.",
  already_linked: 'A parent is already linked to your account.',
  email_not_eligible:
    "That email belongs to a tutor or student account, so it can't be used for a parent.",
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const rl = checkRateLimit(getRateLimitKey(req, 'invite-guardian'), {
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
    const token = (req.headers.get('Authorization') ?? '')
      .replace('Bearer ', '')
      .trim();
    const { data: userData } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null } };
    const student = userData?.user;
    if (!student) return json({ success: false, error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const email =
      typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';

    const { data: result, error: rpcError } = await supabase.rpc(
      'create_guardian_invite',
      { p_student_id: student.id, p_email: email }
    );
    if (rpcError) {
      logStep('ERROR creating invite', { error: rpcError.message });
      return json({ success: false, error: 'Could not send the invite.' }, 500);
    }
    if (!result?.success) {
      return json(
        {
          success: false,
          error: ERRORS[result?.error] ?? 'Could not send the invite.',
        },
        400
      );
    }

    const studentName = fullName(
      {
        first_name: result.student_first_name,
        last_name: result.student_last_name,
      },
      'A Learn2Lead student'
    );
    const invite = buildGuardianInviteEmail({
      studentName,
      token: result.token,
      expiresOn: new Date(result.expires_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      logStep('RESEND_API_KEY not set — invite created, email not sent');
    } else {
      try {
        await new Resend(resendKey).emails.send({
          from: 'Learn2Lead <noreply@learn2lead.page>',
          to: [email.toLowerCase()],
          subject: invite.subject,
          html: invite.html,
        });
      } catch (e) {
        // The invite still works from the parent's dashboard once they sign
        // up with this email; report it so the student can resend.
        logStep('WARNING: invite email failed', { error: String(e) });
        return json({
          success: true,
          email_sent: false,
          expires_at: result.expires_at,
        });
      }
    }

    logStep('Invite sent', { student: student.id });
    return json({
      success: true,
      email_sent: !!resendKey,
      expires_at: result.expires_at,
    });
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return json({ success: false, error: 'Could not send the invite.' }, 500);
  }
});
