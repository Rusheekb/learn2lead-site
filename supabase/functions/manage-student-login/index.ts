import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';

/**
 * A parent manages the sign-in of a student they added
 * (docs/family-accounts-plan.md, Phase B):
 *   setup           username (optional change) + temporary password
 *   reset_password  new temporary password
 *   disable/enable  turn the sign-in off/on (signs them out everywhere)
 * The student chooses their own password at their next sign-in. Students who
 * linked a parent from their own account manage their own sign-in.
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[MANAGE-STUDENT-LOGIN] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

const PASSWORD_RULE =
  'Password must be at least 6 characters and include a letter and a number.';
const passwordOk = (p: string) =>
  p.length >= 6 && /[A-Za-z]/.test(p) && /[0-9]/.test(p);
const USERNAME_ERRORS: Record<string, string> = {
  invalid:
    'Usernames are 3–30 characters: letters, numbers, dots or underscores.',
  reserved: 'That username is reserved. Please choose another.',
  taken: 'That username is taken. Please choose another.',
};

/** Every parent action on a student's sign-in, for admins (best-effort). */
async function audit(
  admin: any,
  actorId: string,
  subjectId: string,
  action: string
) {
  const { error } = await admin.from('account_audit_log').insert({
    actor_id: actorId,
    subject_id: subjectId,
    action: `login_${action}`,
  });
  if (error) logStep('WARNING: audit log failed', { error: error.message });
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const rl = checkRateLimit(getRateLimitKey(req, 'manage-student-login'), {
    maxRequests: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs!, corsHeaders);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const token = (req.headers.get('Authorization') ?? '')
      .replace('Bearer ', '')
      .trim();
    const { data: userData } = token
      ? await admin.auth.getUser(token)
      : { data: { user: null } };
    const parent = userData?.user;
    if (!parent) return json({ success: false, error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const studentId = String(body.student_id ?? '');

    // Only the student's own parent, and only for a student they added.
    const [{ data: link }, { data: student }] = await Promise.all([
      admin
        .from('guardian_links')
        .select('student_id')
        .eq('guardian_id', parent.id)
        .eq('student_id', studentId)
        .maybeSingle(),
      admin
        .from('profiles')
        .select('id, managed, username, first_name')
        .eq('id', studentId)
        .maybeSingle(),
    ]);
    if (!link || !student) {
      return json({ success: false, error: 'Student not found.' }, 404);
    }
    if (!student.managed) {
      return json(
        {
          success: false,
          error: `${student.first_name} manages their own sign-in from their account.`,
        },
        400
      );
    }

    const password = typeof body.password === 'string' ? body.password : '';

    if (action === 'setup' || action === 'reset_password') {
      if (!passwordOk(password)) {
        return json({ success: false, error: PASSWORD_RULE }, 400);
      }
      if (action === 'setup' && typeof body.username === 'string') {
        const username = body.username.trim().toLowerCase();
        if (username && username !== student.username) {
          const { data: check } = await admin.rpc('check_username', {
            p_username: username,
          });
          if (!check?.available) {
            return json(
              {
                success: false,
                error: USERNAME_ERRORS[check?.reason] ?? USERNAME_ERRORS.taken,
              },
              400
            );
          }
          const { error: nameError } = await admin
            .from('profiles')
            .update({ username })
            .eq('id', studentId);
          if (nameError) {
            return json({ success: false, error: USERNAME_ERRORS.taken }, 400);
          }
        }
      }
      const { error } = await admin.auth.admin.updateUserById(studentId, {
        password,
        ban_duration: 'none',
      });
      if (error) {
        logStep('ERROR setting password', { error: error.message });
        return json(
          { success: false, error: 'Could not save the password.' },
          500
        );
      }
      await admin
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', studentId);
      await audit(admin, parent.id, studentId, action);
      logStep(action, { parent: parent.id, student: studentId });
      return json({ success: true });
    }

    if (action === 'disable' || action === 'enable') {
      const { error } = await admin.auth.admin.updateUserById(studentId, {
        ban_duration: action === 'disable' ? '876000h' : 'none',
      });
      if (error) {
        logStep('ERROR updating sign-in', { error: error.message });
        return json({ success: false, error: 'Could not update.' }, 500);
      }
      await audit(admin, parent.id, studentId, action);
      logStep(action, { parent: parent.id, student: studentId });
      return json({ success: true });
    }

    return json({ success: false, error: 'Unknown action.' }, 400);
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return json({ success: false, error: 'Something went wrong.' }, 500);
  }
});
