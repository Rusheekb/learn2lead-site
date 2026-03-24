

## Problem

The 5 "test" Price IDs in `src/config/stripe.ts` are live-mode objects. The `STRIPE_SECRET_KEY_TEST` (test key) cannot look up live-mode prices, causing the 500 error.

## Solution

Create real test-mode products in Stripe, then update the code.

## Step 1: Create 5 test products in Stripe Dashboard

Go to [Stripe Dashboard (test mode)](https://dashboard.stripe.com/test/products) — make sure the **"Test mode"** toggle is ON (top-right).

For each tier, click **"+ Add product"** and create:

| Product Name | Price | Type |
|---|---|---|
| 1 Hour Credit Pack | $40.00 | One time |
| 2 Hours Credit Pack | $76.00 | One time |
| 4 Hours Credit Pack | $140.00 | One time |
| 8 Hours Credit Pack | $240.00 | One time |
| 10 Hours Credit Pack | $280.00 | One time |

After creating each product, copy its **Price ID** (starts with `price_`, found on the product detail page).

## Step 2: Update `src/config/stripe.ts`

Replace the `TEST_PRICE_IDS` object with the 5 new price IDs from step 1.

## Step 3: Update `supabase/functions/create-checkout/index.ts`

Replace the `TEST_PRICE_IDS` array (used for mode detection) with the same 5 new price IDs.

## Step 4: Update `STRIPE_SECRET_KEY_TEST` if needed

If you want to re-save the test secret key with a fresh value, I'll prompt you to do so.

## What you need to provide

After creating the 5 products, paste the price IDs here in this format:
```
1 hour: price_xxx
2 hours: price_xxx
4 hours: price_xxx
8 hours: price_xxx
10 hours: price_xxx
```

I'll then update both files automatically.

