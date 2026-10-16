import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';

/**
 * A parent accepts a student's invite (docs/family-accounts-plan.md, Phase
 * 5b). accept_guardian_invite links them and hands the student's billing
 * over in one transaction (balance, saved card and auto-renew move together).
 * Afterwards, best-effort, the moved Stripe customer's email becomes the
 * parent's so Stripe's own receipts reach them too; if that fails nothing
 * breaks — the card and auto-renew already work from the moved record.
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[ACCEPT-GUARDIAN-INVITE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ERRORS: Record<string, string> = {
  invite_not_found: 'This invitation link is not valid.',
  invite_accepted: 'This invitation has already been accepted.',
  invite_cancelled:
    'This invitation was cancelled. Ask the student to send a new one.',
  invite_expired:
    'This invitation has expired. Ask the student to send a new one.',
  email_mismatch:
    'This invitation was sent to a different email. Sign in with the address it was sent to.',
  guardian_not_eligible:
    "This account can't be a parent account. Sign in with a different email, or contact us.",
  student_not_eligible:
    'This student can no longer be linked. Please contact us.',
  already_linked: 'This student is already linked to a parent.',
};

async function updateStripeCustomerEmail(customerId: string, email: string) {
  for (const key of [
    Deno.env.get('STRIPE_SECRET_KEY'),
    Deno.env.get('STRIPE_SECRET_KEY_TEST'),
  ]) {
    if (!key) continue;
    try {
      await new Stripe(key, {
        apiVersion: '2025-08-27.basil',
      }).customers.update(customerId, { email });
      return true;
    } catch {
      // Not in this mode — try the other one.
    }
  }
  return false;
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

  const rl = checkRateLimit(getRateLimitKey(req, 'accept-guardian-invite'), {
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
    const authToken = (req.headers.get('Authorization') ?? '')
      .replace('Bearer ', '')
      .trim();
    const { data: userData } = authToken
      ? await supabase.auth.getUser(authToken)
      : { data: { user: null } };
    const parent = userData?.user;
    if (!parent?.email)
      return json({ success: false, error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const inviteToken = typeof body.token === 'string' ? body.token.trim() : '';
    if (!UUID_RE.test(inviteToken)) {
      return json({ success: false, error: ERRORS.invite_not_found }, 400);
    }

    const { data: result, error: rpcError } = await supabase.rpc(
      'accept_guardian_invite',
      { p_token: inviteToken, p_guardian_id: parent.id }
    );
    if (rpcError) {
      logStep('ERROR accepting invite', { error: rpcError.message });
      return json(
        { success: false, error: 'Could not accept the invitation.' },
        500
      );
    }
    if (!result?.success) {
      return json(
        {
          success: false,
          error: ERRORS[result?.error] ?? 'Could not accept the invitation.',
        },
        400
      );
    }

    logStep('Invite accepted', {
      parent: parent.id,
      student: result.student_id,
      merged: result.merged,
      hours: result.hours_moved,
    });

    const customerId: string | null = result.stripe_customer_id;
    if (customerId && customerId.startsWith('cus_')) {
      const updated = await updateStripeCustomerEmail(customerId, parent.email);
      if (!updated) {
        logStep('WARNING: could not update Stripe customer email', {
          customerId,
        });
      }
    }

    return json({
      success: true,
      student_first_name: result.student_first_name,
      merged: result.merged,
      hours_moved: result.hours_moved,
    });
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return json(
      { success: false, error: 'Could not accept the invitation.' },
      500
    );
  }
});
