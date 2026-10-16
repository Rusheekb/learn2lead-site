import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';

/**
 * Sign in with a username (docs/family-accounts-plan.md, Phase B).
 *
 * The username is resolved to the account's sign-in address here, on the
 * server, and the password check is Supabase Auth's own — so typing a
 * username never reveals anyone's email, and the response for an unknown
 * username is the same as for a wrong password. Returns the session for the
 * browser to adopt (supabase.auth.setSession).
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[USERNAME-LOGIN] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

const WRONG = 'That username and password don’t match. Please try again.';
const DISABLED =
  'This sign-in has been turned off. Ask your parent to turn it back on.';

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Per client: slows down password guessing against usernames.
  const rl = checkRateLimit(getRateLimitKey(req, 'username-login'), {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs!, corsHeaders);

  try {
    const body = await req.json().catch(() => ({}));
    const username =
      typeof body.username === 'string'
        ? body.username.trim().toLowerCase().slice(0, 64)
        : '';
    const password =
      typeof body.password === 'string' ? body.password.slice(0, 256) : '';
    if (!username || !password) return json({ error: WRONG }, 400);

    // Per username too, wherever the attempts come from.
    const perUser = checkRateLimit(`username-login:user:${username}`, {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (perUser.limited)
      return rateLimitResponse(perUser.retryAfterMs!, corsHeaders);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const admin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: email, error: lookupError } = await admin.rpc(
      'login_email_for_username',
      { p_username: username }
    );
    if (lookupError) {
      logStep('ERROR looking up username', { error: lookupError.message });
      return json({ error: 'Sign-in is unavailable. Please try again.' }, 500);
    }
    if (!email) return json({ error: WRONG }, 400);

    const res = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }
    );
    const session = await res.json().catch(() => ({}));

    if (!res.ok) {
      const code = String(session?.error_code ?? session?.code ?? '');
      if (code === 'user_banned') return json({ error: DISABLED }, 403);
      return json({ error: WRONG }, 400);
    }

    logStep('Signed in', { user: session?.user?.id });
    return json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return json({ error: 'Sign-in is unavailable. Please try again.' }, 500);
  }
});
