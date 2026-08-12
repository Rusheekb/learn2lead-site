# Stripe Webhook Setup Guide

## 🎯 Why You Need This

Your app uses Stripe webhooks to automatically allocate class credits when users subscribe. Without this setup, payments succeed but credits aren't awarded.

## 📋 Setup Steps

### Step 1: Get Your Webhook URL

```
https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/stripe-webhooks
```

### Step 2: Configure Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard**

   - Test Mode: https://dashboard.stripe.com/test/webhooks
   - Live Mode: https://dashboard.stripe.com/webhooks

2. **Click "Add endpoint"**

3. **Enter Endpoint URL**

   ```
   https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/stripe-webhooks
   ```

4. **Select Events to Listen To**

   - ✅ `invoice.payment_succeeded` (CRITICAL - allocates credits)
   - ✅ `invoice.payment_failed` (marks subscription as past_due)
   - ✅ `customer.subscription.deleted` (marks subscription as cancelled)
   - ✅ `customer.subscription.updated` (syncs subscription changes)

5. **Click "Add endpoint"**

6. **Copy the Signing Secret**
   - After creating the endpoint, you'll see a "Signing secret" (starts with `whsec_...`)
   - **IMPORTANT**: This must match your `STRIPE_WEBHOOK_SECRET` environment variable in Supabase

### Step 3: Verify Webhook Secret

The webhook secret should already be configured in your Supabase secrets. To verify:

1. Go to your Supabase project settings
2. Navigate to Edge Functions → Secrets
3. Confirm `STRIPE_WEBHOOK_SECRET` exists and matches the Stripe signing secret

If it doesn't match, update it with the new secret from Stripe.

### Step 4: Test the Webhook

1. **In Stripe Dashboard**, navigate to your webhook endpoint
2. Click **"Send test webhook"**
3. Select event: `invoice.payment_succeeded`
4. Click **"Send test webhook"**

5. **Check Supabase Logs**
   - Go to Supabase Dashboard → Edge Functions → stripe-webhooks → Logs
   - You should see logs indicating the webhook was received and processed
   - Look for: `[STRIPE-WEBHOOK] Processing invoice.payment_succeeded`

### Step 5: Handle Existing Subscriptions

If you already have test subscriptions that were created BEFORE webhook setup:

**Option A: Use Manual Credit Allocation (Recommended)**

1. Log into your app as an admin
2. Go to Admin Dashboard → Testing tab
3. Enter the student's email address
4. Click "Allocate Credits"

**Option B: Cancel and Re-subscribe**

1. Cancel the test subscription in Stripe Dashboard
2. Wait a few minutes for the cancellation to sync
3. Create a new subscription through your app
4. This time the webhook will fire and credits will be allocated

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Webhook endpoint is active in Stripe Dashboard
- [ ] All 4 events are selected (`invoice.payment_succeeded`, etc.)
- [ ] Signing secret matches `STRIPE_WEBHOOK_SECRET` in Supabase
- [ ] Test webhook successfully sent and received
- [ ] Edge function logs show webhook processing
- [ ] New subscriptions allocate credits automatically
- [ ] Credits appear in `student_subscriptions` table
- [ ] Credits appear in `class_credits_ledger` table
- [ ] User dashboard shows correct credit count

## 🔍 Troubleshooting

### Credits Not Appearing After Subscription

1. **Check Stripe Webhook Logs**

   - Go to Stripe Dashboard → Webhooks → Your endpoint → Events
   - Look for `invoice.payment_succeeded` events
   - Check if they show "Success" or "Failed"

2. **Check Supabase Edge Function Logs**

   - Go to Supabase Dashboard → Edge Functions → stripe-webhooks → Logs
   - Look for error messages

3. **Common Issues**
   - ❌ Webhook not configured → No events sent from Stripe
   - ❌ Wrong webhook secret → Events fail signature verification
   - ❌ Wrong events selected → `invoice.payment_succeeded` not triggering
   - ❌ Subscription plan not in database → Can't determine credit amount

### How to Check If Webhook is Working

Run this query in Supabase SQL Editor:

```sql
-- Check if subscription exists in database
SELECT * FROM student_subscriptions
WHERE stripe_subscription_id = 'sub_YOUR_SUBSCRIPTION_ID';

-- Check credit allocation history
SELECT * FROM class_credits_ledger
ORDER BY created_at DESC
LIMIT 10;
```

## 📊 What Happens When Webhook Fires

1. **Stripe sends `invoice.payment_succeeded` event**
2. **Your webhook function (`stripe-webhooks`) receives it**
3. **Function verifies the webhook signature**
4. **Function extracts subscription details**
5. **Function looks up the subscription plan** (Basic, Standard, Premium)
6. **Function creates/updates `student_subscriptions` record**
7. **Function allocates credits** (4, 8, or 12 based on plan)
8. **Function creates `class_credits_ledger` entry** for audit trail

## 🚨 Important Notes

- **Test Mode vs Live Mode**: Set up webhooks separately for test and live modes
- **Webhook Secret**: Different for test and live modes
- **One Endpoint Per Mode**: You need separate webhook endpoints for test and production
- **Signing Secret Security**: Never commit webhook secrets to git
- **Idempotency**: The webhook function handles duplicate events gracefully

## 🎓 Subscription Plans & Credits

| Plan     | Product ID          | Credits Per Month | Monthly Price |
| -------- | ------------------- | ----------------- | ------------- |
| Basic    | prod_THfwMX8OX6X02s | 4 classes         | $140          |
| Standard | prod_TBD            | 8 classes         | $240          |
| Premium  | prod_TBD            | 12 classes        | $300          |

Make sure these plans exist in your `subscription_plans` table with matching `stripe_product_id` values.
