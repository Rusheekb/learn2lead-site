import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { isSendableEmail, managedStudentEmail } from '../_shared/recipients.ts';

/**
 * A parent adds a child (docs/family-accounts-plan.md, Phase 4).
 *
 * The child becomes a "managed" student: a real auth user + profile +
 * students row (from the signup triggers) with a placeholder address and no
 * password, so they can't log in and are never emailed there. Their optional
 * real email is stored separately (profiles.notification_email) for their own
 * class reminders. register_managed_student then links them to the parent in
 * one transaction; if that fails the half-made child is removed again.
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[CREATE-MANAGED-STUDENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/** ilike treats % and _ as wildcards; match the address literally. */
const likeLiteral = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const ERRORS: Record<string, string> = {
  not_a_parent: 'Only family accounts can add students.',
  too_many_children: 'A family account can have up to 10 students.',
  student_not_eligible: 'Could not set up this student. Please try again.',
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

  const rl = checkRateLimit(getRateLimitKey(req, 'create-managed-student'), {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
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
    const parent = userData?.user;
    if (!parent) return json({ success: false, error: 'Unauthorized' }, 401);

    // The role in the database, never user-editable metadata.
    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', parent.id)
      .maybeSingle();
    if (parentProfile?.role !== 'parent') {
      return json({ success: false, error: ERRORS.not_a_parent }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const firstName = clean(body.first_name, 100);
    const lastName = clean(body.last_name, 100);
    const grade = clean(body.grade, 30);
    const email = clean(body.email, 254).toLowerCase();

    if (!firstName) {
      return json(
        { success: false, error: "Enter the student's first name." },
        400
      );
    }
    if (email && !isSendableEmail(email)) {
      return json(
        { success: false, error: 'Enter a valid email address.' },
        400
      );
    }
    if (email) {
      // A student who already has an account should link from their own
      // Settings instead of being duplicated.
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', likeLiteral(email))
        .limit(1);
      if (existing && existing.length > 0) {
        return json(
          {
            success: false,
            code: 'HAS_ACCOUNT',
            error:
              'That email already has a Learn2Lead account. Ask the student to invite you from Settings → Family on their account.',
          },
          409
        );
      }
    }

    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email: managedStudentEmail(crypto.randomUUID()),
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
        app_metadata: { managed_by: parent.id },
      });
    if (createError || !created?.user) {
      logStep('ERROR creating auth user', { error: createError?.message });
      return json({ success: false, error: 'Could not add the student.' }, 500);
    }
    const child = created.user;

    const { data: result, error: rpcError } = await supabase.rpc(
      'register_managed_student',
      {
        p_guardian_id: parent.id,
        p_student_id: child.id,
        p_grade: grade || null,
        p_notification_email: email || null,
      }
    );

    if (rpcError || !result?.success) {
      logStep('ERROR registering student, removing it', {
        error: rpcError?.message ?? result?.error,
      });
      // The profile goes with the auth user (FK cascade); the students row
      // is matched by email, so remove it explicitly.
      await supabase.from('students').delete().eq('email', child.email!);
      await supabase.auth.admin.deleteUser(child.id);
      const message =
        (result?.error && ERRORS[result.error]) || 'Could not add the student.';
      return json({ success: false, error: message }, rpcError ? 500 : 400);
    }

    logStep('Student added', { parent: parent.id, student: child.id });
    return json({
      success: true,
      student: { id: child.id, first_name: firstName, last_name: lastName },
    });
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return json({ success: false, error: 'Could not add the student.' }, 500);
  }
});
