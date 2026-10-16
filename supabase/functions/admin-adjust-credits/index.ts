import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { resolveOrCreateSubscriptionId } from '../_shared/creditSubscriptionResolver.ts';
import { getBillingAccountId } from '../_shared/recipients.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const rateLimitKey = getRateLimitKey(req, 'admin-adjust-credits');
  const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return rateLimitResponse(retryAfterMs!, corsHeaders);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Profile/role error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { student_id, amount, reason, rate_per_hour } = await req.json();

    if (!student_id || typeof amount !== 'number' || amount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'student_id and a non-zero numeric amount are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'reason is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    if (
      rate_per_hour !== undefined &&
      rate_per_hour !== null &&
      (typeof rate_per_hour !== 'number' || rate_per_hour <= 0)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'rate_per_hour must be a positive number when provided',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // A student with a parent shares the family balance: adjust that one.
    // (The history entry still names the student.)
    let subscriptionId: string;
    try {
      const billingId = await getBillingAccountId(supabaseAdmin, student_id);
      ({ subscriptionId } = await resolveOrCreateSubscriptionId(
        supabaseAdmin,
        billingId
      ));
    } catch (resolveError) {
      console.error('Failed to resolve/bootstrap subscription:', resolveError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to set up hours tracking for this student',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Admin ${user.id} adjusting credits for student ${student_id}: ${amount} (${reason})`
    );

    // Row-locked, idempotent-safe write — replaces what used to be a raw
    // read-then-write from the browser (stale-balance race risk if two
    // adjustments, or an adjustment and a real class completion, land
    // concurrently).
    //
    // apply_credit_ledger_entry applies p_amount to the balance by its sign
    // alone — p_transaction_type is stored only as a display label, it does
    // not control the arithmetic. Stripping the sign here (Math.abs) while
    // still labeling negative amounts 'debit' silently turned every removal
    // into an addition of the same size, labeled as if it had been removed.
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'apply_credit_ledger_entry',
      {
        p_student_id: student_id,
        p_subscription_id: subscriptionId,
        p_transaction_type: amount > 0 ? 'credit' : 'debit',
        p_amount: amount,
        p_reason: `Admin adjustment: ${reason.trim()}`,
        p_allow_negative: true,
      }
    );

    if (rpcError || !rpcResult?.success) {
      console.error(
        'apply_credit_ledger_entry RPC failed:',
        rpcError,
        rpcResult
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: rpcResult?.error || 'Failed to adjust hours',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // One-off manual pricing: only meaningful when credits are being added
    // with a declared rate (e.g. a Zelle side agreement priced outside
    // Stripe). Sets/replaces the pending manual-rate batch on the
    // subscription; complete_class_atomic prices exactly `amount` upcoming
    // classes at this rate, then self-reverts to Stripe-derived pricing.
    // Best-effort — the credit adjustment itself already succeeded above, so
    // a failure here doesn't roll that back, just logs for follow-up.
    if (amount > 0 && typeof rate_per_hour === 'number' && rate_per_hour > 0) {
      const { error: rateError } = await supabaseAdmin
        .from('student_subscriptions')
        .update({
          manual_price_per_hour: rate_per_hour,
          manual_priced_classes_remaining: amount,
        })
        .eq('id', subscriptionId);
      if (rateError) {
        console.error('Failed to set manual class rate:', rateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_balance: rpcResult.new_balance,
        adjusted_by: user.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-adjust-credits:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
