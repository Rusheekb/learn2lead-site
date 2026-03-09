

# Update Stripe Integration for learn2lead.page

## Code Changes

### 1. Fix email dashboard link in `stripe-webhooks/index.ts`
Line 430 has a hardcoded link to `learn2lead-site.lovable.app/dashboard`. Update to `https://learn2lead.page/dashboard`.

### 2. Fix CORS headers in `_shared/cors.ts`
The `Access-Control-Allow-Headers` on line 53 is missing several Supabase client headers that are required. Update to include all required headers: `authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`.

## Manual Steps (Stripe Dashboard)

You need to update the webhook endpoint URL in the Stripe Dashboard:

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Find the existing endpoint pointing to `https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/stripe-webhooks`
3. This URL does **not** need to change — it points to your Supabase Edge Function directly, not your custom domain. Stripe calls your Supabase function URL, not your website URL.

So the webhook endpoint URL is actually fine as-is. The only code changes needed are the email link and CORS headers.

