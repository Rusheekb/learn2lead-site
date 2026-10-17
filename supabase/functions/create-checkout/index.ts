import Stripe from 'https://esm.sh/stripe@18.5.0';
import { reportError } from '../_shared/errorReporting.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { getBillingAccountId } from '../_shared/recipients.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Rate limit: 10 checkout attempts per 5 minutes
  const rlKey = getRateLimitKey(req, 'create-checkout');
  const rl = checkRateLimit(rlKey, {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (rl.limited) {
    logStep('Rate limited', { key: rlKey });
    return rateLimitResponse(rl.retryAfterMs!, corsHeaders);
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    logStep('Function started');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');

    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email)
      throw new Error('User not authenticated or email not available');

    logStep('User authenticated', { userId: user.id, email: user.email });

    // A student whose parent pays would be buying hours onto a balance their
    // classes no longer use — the parent buys for the family instead.
    // A failed lookup never blocks a purchase.
    const billingId = await getBillingAccountId(supabaseClient, user.id).catch(
      (e) => {
        logStep('WARNING: billing account lookup failed', {
          error: String(e),
        });
        return user.id;
      }
    );
    if (billingId !== user.id) {
      logStep('Blocked: hours managed by parent', { billingId });
      return new Response(
        JSON.stringify({
          error:
            'Your hours are managed by your parent. Ask them to buy more from their Learn2Lead account.',
          code: 'MANAGED_BY_PARENT',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        }
      );
    }

    // Parents land back on the family dashboard after paying.
    const { data: buyer } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const buyerHome = buyer?.role === 'parent' ? 'family' : 'dashboard';

    const { priceId, referralCode, autoRenewOptIn } = await req.json();
    if (!priceId) throw new Error('Price ID is required');

    // Don't rely on a manually-toggled STRIPE_MODE secret staying in sync with
    // whichever mode the frontend happens to be sending (VITE_STRIPE_MODE) —
    // that's exactly the kind of thing that silently drifts (this function's
    // STRIPE_MODE secret was never actually set, so it was always defaulting
    // to live and failing for any test-mode price ID sent from local dev).
    // Instead, resolve the price ID against whichever key it actually belongs
    // to — try live first (the common case for real traffic), fall back to
    // test if Stripe reports the price doesn't exist under that key. Same
    // resilience pattern already used in customer-portal.
    const liveKey = Deno.env.get('STRIPE_SECRET_KEY');
    const testKey = Deno.env.get('STRIPE_SECRET_KEY_TEST');
    if (!liveKey && !testKey)
      throw new Error('No Stripe secret key configured');

    let stripe: Stripe | null = null;
    let isTestMode = false;
    let customerId: string | undefined;

    for (const candidate of [
      { key: liveKey, isTest: false },
      { key: testKey, isTest: true },
    ]) {
      if (!candidate.key) continue;
      const candidateStripe = new Stripe(candidate.key, {
        apiVersion: '2025-08-27.basil',
      });
      try {
        // Cheap existence check before we commit to this key for the whole flow.
        await candidateStripe.prices.retrieve(priceId);
        stripe = candidateStripe;
        isTestMode = candidate.isTest;
        break;
      } catch (priceError) {
        logStep('Price not found under this key, trying next', {
          isTest: candidate.isTest,
          error:
            priceError instanceof Error
              ? priceError.message
              : String(priceError),
        });
      }
    }

    if (!stripe) {
      throw new Error(
        `Price ${priceId} was not found in either live or test mode`
      );
    }

    logStep('Creating checkout session', {
      priceId,
      isTestMode,
      referralCode: referralCode || 'none',
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep('Existing customer found', { customerId });
    } else {
      // Previously this branch only logged and left customerId undefined,
      // relying on customer_email + setup_future_usage to make Stripe attach
      // a customer to the session automatically. Confirmed via a real test
      // checkout that this doesn't reliably happen — session.customer came
      // back null in the completed webhook, silently breaking auto-renewal
      // (no customer to attach a default payment method to) and leaving
      // student_subscriptions.stripe_customer_id on the synthetic
      // `checkout_${profileId}` fallback in stripe-webhooks instead of a
      // real Stripe id. Creating it explicitly guarantees a real customer
      // exists before the session does.
      const newCustomer = await stripe.customers.create({ email: user.email });
      customerId = newCustomer.id;
      logStep('Created new customer', { customerId });
    }

    // Validate referral code if provided
    let stripeCouponId: string | null = null;
    let referralCodeId: string | null = null;
    let referrerId: string | null = null;
    let discountAmount: number | null = null;

    if (referralCode) {
      logStep('Validating referral code', { code: referralCode });

      const { data: codeData, error: codeError } = await supabaseClient
        .from('referral_codes')
        .select(
          'id, code, stripe_coupon_id, active, expires_at, max_uses, times_used, created_by, discount_amount'
        )
        .eq('code', referralCode.toUpperCase())
        .single();

      if (codeError || !codeData) {
        logStep('Invalid referral code', { code: referralCode });
        throw new Error('Invalid referral code');
      }

      if (!codeData.active) {
        logStep('Referral code is inactive', { code: referralCode });
        throw new Error('This referral code is no longer active');
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        logStep('Referral code expired', {
          code: referralCode,
          expires_at: codeData.expires_at,
        });
        throw new Error('This referral code has expired');
      }

      if (codeData.max_uses && codeData.times_used >= codeData.max_uses) {
        logStep('Referral code max uses reached', { code: referralCode });
        throw new Error('This referral code has reached its usage limit');
      }

      const { data: existingUsage } = await supabaseClient
        .from('referral_usage')
        .select('id')
        .eq('used_by_user_id', user.id)
        .limit(1);

      if (existingUsage && existingUsage.length > 0) {
        logStep('User has already used a referral code', { userId: user.id });
        throw new Error('You have already used a referral code');
      }

      if (codeData.created_by === user.id) {
        logStep('Self-referral attempted', { userId: user.id });
        throw new Error('You cannot use your own referral code');
      }

      stripeCouponId = codeData.stripe_coupon_id;
      referralCodeId = codeData.id;
      referrerId = codeData.created_by;
      discountAmount = codeData.discount_amount;

      logStep('Referral code validated', {
        codeId: referralCodeId,
        referrerId,
        stripeCouponId,
        discountAmount,
      });
    }

    // Build checkout session config - ONE-TIME PAYMENT (not subscription)
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      // customerId is always a real Stripe customer id by this point —
      // either found above or just created — so customer_email (Stripe's
      // guest-checkout field) is never needed here.
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        setup_future_usage: 'off_session', // Save payment method for auto-renewal
      },
      success_url: `${origin}/${buyerHome}?purchase=success`,
      cancel_url: `${origin}/pricing?purchase=cancelled`,
      metadata: {
        user_id: user.id,
        referral_code_id: referralCodeId || '',
        referrer_id: referrerId || '',
        discount_amount: discountAmount?.toString() || '',
        // Stripe metadata values are strings only — read back as a string
        // comparison in allocateCreditsFromCheckout, not a real boolean.
        auto_renew_opt_in: autoRenewOptIn === true ? 'true' : 'false',
      },
    };

    // Apply coupon if referral code is valid
    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }];
      logStep('Applying coupon to checkout', { couponId: stripeCouponId });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep('Checkout session created', {
      sessionId: session.id,
      url: session.url,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in create-checkout', { message: errorMessage });
    await reportError('create-checkout', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
