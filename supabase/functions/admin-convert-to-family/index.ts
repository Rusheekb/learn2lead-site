import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { managedStudentEmail } from '../_shared/recipients.ts';

/**
 * Admin fallback (docs/family-accounts-plan.md, Phase 6): an existing account
 * whose email is really the parent's becomes a family account. The login
 * becomes the parent (keeping email, Stripe customer, balance, auto-renew);
 * a new managed child takes over the student records.
 *
 * dry_run = true only reports what would move. For the real run this creates
 * the child's auth user (needs the service role), then calls
 * convert_account_to_family *as the admin* — the class_logs guard only lets
 * admins re-point logs, and the role change is audited under them. If the
 * conversion fails, the new child is removed again.
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[ADMIN-CONVERT-TO-FAMILY] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const ERRORS: Record<string, string> = {
  account_not_eligible:
    'Only a student account (not already a family account or child) can be converted.',
  already_linked: 'This student is already linked to a parent.',
  parent_first_name_required: "Enter the parent's first name.",
  child_not_eligible: 'Could not set up the student. Please try again.',
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

  const rl = checkRateLimit(getRateLimitKey(req, 'admin-convert-to-family'), {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs!, corsHeaders);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAdmin = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader)
      return json({ success: false, error: 'Unauthorized' }, 401);

    // Calls made as the signed-in admin.
    const supabaseAsAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );
    const {
      data: { user },
    } = await supabaseAsAdmin.auth.getUser();
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') {
      return json({ success: false, error: 'Admin access required' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const accountId = clean(body.account_id, 64);
    const dryRun = body.dry_run !== false;
    if (!accountId) {
      return json({ success: false, error: 'account_id is required' }, 400);
    }

    if (dryRun) {
      const { data, error } = await supabaseAsAdmin.rpc(
        'convert_account_to_family',
        {
          p_account_id: accountId,
          p_child_id: null,
          p_parent_first_name: null,
          p_parent_last_name: null,
          p_dry_run: true,
        }
      );
      if (error) {
        logStep('ERROR in dry run', { error: error.message });
        return json({ success: false, error: 'Dry run failed.' }, 500);
      }
      if (!data?.success) {
        return json(
          { success: false, error: ERRORS[data?.error] ?? 'Dry run failed.' },
          400
        );
      }
      return json(data);
    }

    const parentFirst = clean(body.parent_first_name, 100);
    const parentLast = clean(body.parent_last_name, 100);
    const childFirst = clean(body.child_first_name, 100);
    const childLast = clean(body.child_last_name, 100);
    if (!parentFirst || !childFirst) {
      return json(
        {
          success: false,
          error: "Enter the parent's and the student's first names.",
        },
        400
      );
    }

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: managedStudentEmail(crypto.randomUUID()),
        email_confirm: true,
        user_metadata: { first_name: childFirst, last_name: childLast },
        app_metadata: { managed_by: accountId, converted_by: user.id },
      });
    if (createError || !created?.user) {
      logStep('ERROR creating child', { error: createError?.message });
      return json(
        { success: false, error: 'Could not create the student.' },
        500
      );
    }
    const child = created.user;

    const { data, error } = await supabaseAsAdmin.rpc(
      'convert_account_to_family',
      {
        p_account_id: accountId,
        p_child_id: child.id,
        p_parent_first_name: parentFirst,
        p_parent_last_name: parentLast,
        p_dry_run: false,
      }
    );

    if (error || !data?.success) {
      logStep('ERROR converting, removing new child', {
        error: error?.message ?? data?.error,
      });
      await supabaseAdmin.from('students').delete().eq('email', child.email!);
      await supabaseAdmin.auth.admin.deleteUser(child.id);
      return json(
        {
          success: false,
          error:
            ERRORS[data?.error] ?? 'Conversion failed. Nothing was changed.',
        },
        error ? 500 : 400
      );
    }

    logStep('Converted', {
      admin: user.id,
      account: accountId,
      child: child.id,
      moved: data.moved,
    });
    return json({ ...data, child_id: child.id });
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return json({ success: false, error: 'Conversion failed.' }, 500);
  }
});
