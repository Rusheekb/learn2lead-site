import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

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

    const { student_id, amount, reason } = await req.json();

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

    const { data: sub, error: subError } = await supabaseAdmin
      .from('student_subscriptions')
      .select('id')
      .eq('student_id', student_id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (subError || !sub) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active subscription found for this student',
        }),
        {
          status: 404,
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
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'apply_credit_ledger_entry',
      {
        p_student_id: student_id,
        p_subscription_id: sub.id,
        p_transaction_type: amount > 0 ? 'credit' : 'debit',
        p_amount: Math.abs(amount),
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
          error: rpcResult?.error || 'Failed to adjust credits',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
