import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { fullName, getBillingAccountId } from '../_shared/recipients.ts';

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

    // Verify the token with Supabase Auth. This used to base64-decode the
    // JWT and trust its `sub` claim without checking the signature, so a
    // forged token naming any user id returned that user's subscription
    // and balance.
    const { data: adminUserData, error: adminError } =
      await supabaseClient.auth.getUser(token);
    if (adminError || !adminUserData?.user) {
      logStep('Token verification failed', { error: adminError?.message });
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
    let pricePerHour = null;

    // A student whose parent pays sees the family balance, and who manages
    // it. Everyone else (no parent) reads their own, as before.
    // Loaded on every dashboard visit, so a failed lookup falls back to the
    // caller's own balance rather than erroring.
    const billingId = await getBillingAccountId(supabaseClient, userId).catch(
      (e) => {
        logStep('WARNING: billing account lookup failed', {
          error: String(e),
        });
        return userId;
      }
    );
    let managedBy: { name: string } | null = null;
    let hoursHidden = false;
    if (billingId !== userId) {
      const [{ data: guardian }, { data: me }] = await Promise.all([
        supabaseClient
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', billingId)
          .maybeSingle(),
        supabaseClient
          .from('profiles')
          .select('hide_hours_from_student')
          .eq('id', userId)
          .maybeSingle(),
      ]);
      managedBy = { name: fullName(guardian, 'your parent') };
      hoursHidden = !!me?.hide_hours_from_student;
      logStep('Balance managed by parent', { billingId, hoursHidden });
    }

    const { data: subData, error: subError } = await supabaseClient
      .from('student_subscriptions')
      .select(
        'id, status, credits_remaining, plan_id, subscription_plans(name, price_per_hour)'
      )
      .eq('student_id', billingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subData && !subError) {
      hasAccount = true;
      creditsRemaining = subData.credits_remaining || 0;
      // A many-to-one embed arrives as one object; the untyped client
      // infers a list, so accept either shape.
      type Plan = { name: string | null; price_per_hour: number | null };
      const planRow = subData.subscription_plans as unknown as
        | Plan
        | Plan[]
        | null;
      const plan = Array.isArray(planRow) ? planRow[0] : planRow;
      planName = plan?.name || 'Direct Payment';
      pricePerHour = plan?.price_per_hour || null;
      logStep('Found subscription record', {
        planName,
        pricePerHour,
        creditsRemaining,
      });
    } else {
      // Zelle/manual users may have ledger history with no subscription
      // record at all — fall back to the ledger's latest row for this
      // narrower, legacy case only.
      const { data: ledgerData, error: ledgerError } = await supabaseClient
        .from('class_credits_ledger')
        .select('balance_after')
        .eq('student_id', billingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ledgerData && !ledgerError) {
        hasAccount = true;
        creditsRemaining = ledgerData.balance_after || 0;
        planName = 'Direct Payment';
        pricePerHour = 35;
        logStep(
          'No subscription record but has ledger entries - manual/Zelle user',
          { creditsRemaining }
        );
      } else {
        logStep('No subscription record and no ledger entries');
      }
    }

    // A student whose parent pays gets hours only (or nothing, if the parent
    // hides them) — never the plan, the price or anything else about billing.
    if (managedBy) {
      return new Response(
        JSON.stringify({
          subscribed: hasAccount,
          credits_remaining: hoursHidden ? null : creditsRemaining,
          plan_name: null,
          price_per_hour: null,
          managed_by: managedBy,
          hours_hidden: hoursHidden,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        subscribed: hasAccount,
        credits_remaining: creditsRemaining,
        plan_name: planName,
        price_per_hour: pricePerHour,
        managed_by: null,
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
