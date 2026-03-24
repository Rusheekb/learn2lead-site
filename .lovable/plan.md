

## Problem

The Stripe webhook is working correctly — it receives the `checkout.session.completed` event, verifies the test signature, and retrieves the test price ID (`price_1TEZwr14Kl9WjCflCJO1JuLU`). However, when it queries the `subscription_plans` table to determine how many credits to award, no matching row exists because the table only contains **live-mode** Price IDs.

From the logs:
```
ERROR: No plan found for price - {"priceId":"price_1TEZwr14Kl9WjCflCJO1JuLU"}
```

The `subscription_plans` table currently has these Price IDs (all live):
- `price_1T3VMD14Kl9WjCfljetZW63c` (1 hour)
- `price_1T3VME14Kl9WjCflQY8WEY97` (2 hours)
- `price_1T20M714Kl9WjCflVbq3glKt` (4 hours)
- `price_1T20M714Kl9WjCflDIKczcAX` (8 hours)
- `price_1T3VMF14Kl9WjCfl0q3uc13H` (10 hours)

But the checkout used test Price IDs that aren't in that table.

## Solution

Add the 5 test-mode plans to the `subscription_plans` table so the webhook can look up credits for test purchases. This is a database insert — no code changes needed.

### Insert test-mode plans via migration

Insert 5 new rows into `subscription_plans` with the test Price IDs:

| Name | Credits | Price | Test Price ID |
|---|---|---|---|
| 1 Credit Pack | 1 | $40 | `price_1TEZwr14Kl9WjCflCJO1JuLU` |
| 2 Credit Pack | 2 | $76 | `price_1TEZy714Kl9WjCfl7YUFnRM3` |
| 4 Credit Pack | 4 | $140 | `price_1TEZyQ14Kl9WjCflTtGqGEYL` |
| 8 Credit Pack | 8 | $240 | `price_1TEZyh14Kl9WjCflk6c1kecm` |
| 10 Credit Pack | 10 | $280 | `price_1TEZyu14Kl9WjCfluumnEvC0` |

Each row will use a placeholder `stripe_product_id` prefixed with `test_` to distinguish them from live plans. The `price_per_class` values will match the live equivalents.

### After the fix

The two payments you already made will need manual credit allocation since the webhooks already fired and returned without allocating. I'll add 2 credits (2 x 1-hour pack) to your account after the fix is in place, or you can re-test with new purchases.

