import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-CREATE-REFERRAL-CODE] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const rlKey = getRateLimitKey(req, 'admin-create-referral-code');
  const { limited, retryAfterMs } = checkRateLimit(rlKey, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return rateLimitResponse(retryAfterMs!, corsHeaders);

  try {
    logStep('Function started');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate and verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error('Not authenticated');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    logStep('Admin verified', { userId: userData.user.id });

    const { code, discountAmount, maxUses, expiresAt } = await req.json();

    if (!code || typeof code !== 'string' || code.trim() === '') {
      throw new Error('code is required');
    }
    if (!discountAmount || discountAmount <= 0) {
      throw new Error('discountAmount must be a positive number');
    }

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '-');

    // Check uniqueness
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (existing) throw new Error(`Code "${normalizedCode}" already exists`);

    // Pick the right Stripe key
    const stripeMode = Deno.env.get('STRIPE_MODE') || 'live';
    const stripeKey =
      stripeMode !== 'live'
        ? Deno.env.get('STRIPE_SECRET_KEY_TEST')
        : Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) throw new Error('Stripe key not configured');

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Create Stripe coupon
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(discountAmount * 100), // dollars → cents
      currency: 'usd',
      duration: 'once',
      name: `Referral: ${normalizedCode}`,
      ...(maxUses ? { max_redemptions: maxUses } : {}),
      ...(expiresAt
        ? { redeem_by: Math.floor(new Date(expiresAt).getTime() / 1000) }
        : {}),
      metadata: {
        referral_code: normalizedCode,
        created_by_admin: userData.user.id,
      },
    });

    logStep('Stripe coupon created', { couponId: coupon.id });

    const { data: newCode, error: insertError } = await supabase
      .from('referral_codes')
      .insert({
        code: normalizedCode,
        stripe_coupon_id: coupon.id,
        discount_amount: discountAmount,
        max_uses: maxUses ?? null,
        expires_at: expiresAt ?? null,
        active: true,
        times_used: 0,
        // created_by left null for admin-created codes
      })
      .select()
      .single();

    if (insertError) {
      // Roll back the Stripe coupon to avoid orphans
      await stripe.coupons.del(coupon.id).catch(() => {});
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    logStep('Referral code created', { code: normalizedCode });

    return new Response(JSON.stringify({ success: true, code: newCode }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
