// Deno.serve is built-in, no import needed
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
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const rateLimitKey = getRateLimitKey(req, 'customer-portal');
  const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (limited) return rateLimitResponse(retryAfterMs!, corsHeaders);

  try {
    logStep('Function started');

    const liveKey = Deno.env.get('STRIPE_SECRET_KEY');
    const testKey = Deno.env.get('STRIPE_SECRET_KEY_TEST');
    if (!liveKey && !testKey)
      throw new Error('No Stripe secret key configured');
    logStep('Stripe keys checked', { hasLive: !!liveKey, hasTest: !!testKey });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    logStep('Authorization header found');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser(token);
    if (userError)
      throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email)
      throw new Error('User not authenticated or email not available');
    logStep('User authenticated', { userId: user.id, email: user.email });

    const liveStripe = liveKey
      ? new Stripe(liveKey, { apiVersion: '2025-08-27.basil' })
      : null;
    const testStripe = testKey
      ? new Stripe(testKey, { apiVersion: '2025-08-27.basil' })
      : null;

    let stripe: Stripe | null = null;
    let customerId: string | null = null;

    // Prefer the customer ID we already have on file — faster and more
    // reliable than an email search (email case differences, a customer
    // later merged/deleted in Stripe, etc).
    const { data: sub } = await supabaseClient
      .from('student_subscriptions')
      .select('stripe_customer_id')
      .eq('student_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub?.stripe_customer_id) {
      for (const candidate of [
        { client: liveStripe, label: 'live' },
        { client: testStripe, label: 'test' },
      ]) {
        if (!candidate.client) continue;
        try {
          const customer = await candidate.client.customers.retrieve(
            sub.stripe_customer_id
          );
          if (!('deleted' in customer && customer.deleted)) {
            stripe = candidate.client;
            customerId = sub.stripe_customer_id;
            logStep('Found Stripe customer via stored ID', {
              customerId,
              mode: candidate.label,
            });
            break;
          }
        } catch {
          // Not found in this mode — try the next one, then fall back to email search below.
        }
      }
    }

    // Fall back to an email search if the stored ID is missing, fake, or
    // no longer exists in either mode.
    if (!customerId) {
      for (const candidate of [
        { client: liveStripe, label: 'live' },
        { client: testStripe, label: 'test' },
      ]) {
        if (!candidate.client) continue;
        const customers = await candidate.client.customers.list({
          email: user.email,
          limit: 1,
        });
        if (customers.data.length > 0) {
          stripe = candidate.client;
          customerId = customers.data[0].id;
          logStep('Found Stripe customer via email search', {
            customerId,
            mode: candidate.label,
          });
          break;
        }
      }
    }

    if (!stripe || !customerId) {
      logStep('No Stripe customer found via stored ID or email in either mode');
      throw new Error(
        "We couldn't find a payment method on file for your account yet. This usually means your hours were added manually rather than through a card purchase — buy hours from the Pricing page to set one up."
      );
    }

    // Return to dashboard instead of homepage for better UX
    const returnUrl = `${origin}/dashboard`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    logStep('Customer portal session created', {
      sessionId: portalSession.id,
      url: portalSession.url,
      returnUrl,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in customer-portal', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
