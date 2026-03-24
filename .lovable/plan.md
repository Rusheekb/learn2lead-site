

## Problem

The frontend correctly switches Price IDs between test and live mode, but the `create-checkout` edge function always uses the single `STRIPE_SECRET_KEY` secret, which is your **live** key (`sk_live_...`). Stripe rejects the request because a live key cannot process test-mode Price IDs.

## Solution

Add a `STRIPE_SECRET_KEY_TEST` secret containing your Stripe test secret key (`sk_test_...`), then update the edge function to pick the correct key based on which Price ID it receives.

## Changes

### 1. Add new secret: `STRIPE_SECRET_KEY_TEST`
- You'll need to copy your test secret key from the [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys) (make sure "Test mode" is toggled on)
- We'll store it as a Supabase edge function secret

### 2. Update `supabase/functions/create-checkout/index.ts`
- Define the known test Price ID prefixes (or a list of test price IDs)
- If the incoming `priceId` matches a test-mode price, use `STRIPE_SECRET_KEY_TEST`; otherwise use `STRIPE_SECRET_KEY`
- This is ~5 lines of logic change around line 50

### 3. Update `supabase/functions/stripe-webhooks/index.ts`
- Similarly, the webhook handler needs to verify signatures with the correct secret
- `STRIPE_WEBHOOK_SECRET_TEST` already exists as a secret, so this may already be handled — will verify and update if needed

## What You Need To Do
1. Go to [Stripe Dashboard (test mode)](https://dashboard.stripe.com/test/apikeys) and copy your **Secret key** (starts with `sk_test_`)
2. I'll prompt you to save it as a secret called `STRIPE_SECRET_KEY_TEST`

