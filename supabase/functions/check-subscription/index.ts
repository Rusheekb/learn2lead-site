import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const rateLimitKey = getRateLimitKey(req, 'check-subscription');
  const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return rateLimitResponse(retryAfterMs!, corsHeaders);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    logStep('Function started');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep('No authorization header provided');
      return new Response(
        JSON.stringify({
          subscribed: false,
          credits_remaining: 0,
          auth_error: true,
          error: 'Authentication required',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token === 'undefined' || token === 'null') {
      logStep('Invalid token format');
      return new Response(
        JSON.stringify({
          subscribed: false,
          credits_remaining: 0,
          auth_error: true,
          error: 'Invalid authentication token',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    logStep('Authenticating user with token');

    // Decode JWT payload to extract user info
    let jwtPayload: any;
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) throw new Error('Invalid JWT format');
      jwtPayload = JSON.parse(atob(payloadBase64));
      if (!jwtPayload.sub) throw new Error('No sub claim in JWT');
    } catch (e) {
      logStep('JWT decode failed', {
        error: e instanceof Error ? e.message : String(e),
      });
      return new Response(
        JSON.stringify({
          subscribed: false,
          credits_remaining: 0,
          auth_error: true,
          error: 'Invalid authentication token',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Verify user exists via admin API
    const { data: adminUserData, error: adminError } =
      await supabaseClient.auth.admin.getUserById(jwtPayload.sub);
    if (adminError || !adminUserData?.user) {
      logStep('Admin user verification failed', { error: adminError?.message });
      return new Response(
        JSON.stringify({
          subscribed: false,
          credits_remaining: 0,
          auth_error: true,
          error: 'Session expired or invalid',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const user = adminUserData.user;
    const userId = user.id;
    const userEmail = user.email as string;

    if (!userEmail) {
      logStep('User email not available');
      return new Response(
        JSON.stringify({
          subscribed: false,
          credits_remaining: 0,
          auth_error: true,
          error: 'User email not available',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }
    logStep('User authenticated', { userId, email: userEmail });

    // student_subscriptions.credits_remaining is the primary source of truth
    // for balance — it's kept in sync by a trigger that fires in true
    // insertion order on every ledger write, under the same row lock as the
    // write itself. This used to be re-derived from the ledger instead via
    // `ORDER BY created_at DESC LIMIT 1`, which has no tiebreaker: confirmed
    // live that two ledger rows written in the same transaction batch landed
    // with an identical created_at timestamp, and that query
    // non-deterministically returned the wrong one. Only fall back to
    // deriving from the ledger for the narrower legacy case below (a student
    // with ledger history but no subscription record at all).
    let creditsRemaining = 0;
    let hasAccount = false;
    let planName = null;
    let pricePerClass = null;

    const { data: subData, error: subError } = await supabaseClient
      .from('student_subscriptions')
      .select(
        'id, status, credits_remaining, plan_id, subscription_plans(name, price_per_class)'
      )
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subData && !subError) {
      hasAccount = true;
      creditsRemaining = subData.credits_remaining || 0;
      planName = subData.subscription_plans?.name || 'Direct Payment';
      pricePerClass = subData.subscription_plans?.price_per_class || null;
      logStep('Found subscription record', {
        planName,
        pricePerClass,
        creditsRemaining,
      });
    } else {
      // Zelle/manual users may have ledger history with no subscription
      // record at all — fall back to the ledger's latest row for this
      // narrower, legacy case only.
      const { data: ledgerData, error: ledgerError } = await supabaseClient
        .from('class_credits_ledger')
        .select('balance_after')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ledgerData && !ledgerError) {
        hasAccount = true;
        creditsRemaining = ledgerData.balance_after || 0;
        planName = 'Direct Payment';
        pricePerClass = 35;
        logStep(
          'No subscription record but has ledger entries - manual/Zelle user',
          { creditsRemaining }
        );
      } else {
        logStep('No subscription record and no ledger entries');
      }
    }

    return new Response(
      JSON.stringify({
        subscribed: hasAccount,
        credits_remaining: creditsRemaining,
        plan_name: planName,
        price_per_class: pricePerClass,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in check-subscription', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
