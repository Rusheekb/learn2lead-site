

## Update Stripe Live Mode Price IDs

All three subscription products have been successfully created in your **live** Stripe account:

| Plan | Product ID | Price ID | Monthly Price |
|------|-----------|----------|---------------|
| Basic | prod_TxxUSeBB0DJMLi | price_1T01Zi14Kl9WjCflqrAzXqYu | $140/month |
| Standard | prod_TxxUJZVuu6ZtEx | price_1T01Zs14Kl9WjCflVUwAOvX7 | $240/month |
| Premium | prod_TxxUZQg4wLStP8 | price_1T01Zu14Kl9WjCfllEyxHM37 | $300/month |

### Changes Required

**1. Update `src/config/stripe.ts`**
Replace the old test-mode Price IDs with the new live-mode ones:
- basic: `price_1T01Zi14Kl9WjCflqrAzXqYu`
- standard: `price_1T01Zs14Kl9WjCflVUwAOvX7`
- premium: `price_1T01Zu14Kl9WjCfllEyxHM37`

**2. Update `subscription_plans` database table**
Update the existing rows in the `subscription_plans` table with the new live `stripe_price_id` and `stripe_product_id` values so the webhook can correctly match incoming Stripe events to the right plan.

