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

  const rateLimitKey = getRateLimitKey(req, 'restore-class-credit');
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

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Could not verify user role' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (profile.role !== 'tutor' && profile.role !== 'admin') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only tutors and admins can restore credits',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { student_id, class_id, reason } = await req.json();

    if (!student_id || !class_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'student_id and class_id are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Reversing debit for student ${student_id}, class ${class_id}, by ${user.id} (${profile.role})`
    );

    // Atomic: checks class_logs first (never reverse a class that's actually
    // logged), then locks the subscription and ties the reversal to the specific
    // debit via reversed_debit_id — a retry of this same request can't double-restore.
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'reverse_class_debit',
      {
        p_student_id: student_id,
        p_class_id: class_id,
        p_reason: reason || 'Credit restored - class completion error recovery',
      }
    );

    if (rpcError) {
      console.error('reverse_class_debit RPC failed:', rpcError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to restore credit' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!rpcResult.success) {
      // class_already_completed: the class really is logged, nothing to restore —
      // not an error, just tell the caller so it can show a neutral message.
      const status = rpcResult.error === 'class_already_completed' ? 200 : 404;
      return new Response(JSON.stringify(rpcResult), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `Restore result for student ${student_id}: idempotent=${rpcResult.idempotent}, new_balance=${rpcResult.new_balance}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        idempotent: rpcResult.idempotent,
        new_balance: rpcResult.new_balance,
        restored_by: user.id,
        restored_by_role: profile.role,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in restore-class-credit:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
