

# Fix: Credit Count Shows 0 Instead of Actual Balance

## Root Cause
In `supabase/functions/check-subscription/index.ts`, when no Stripe customer is found for a user's email, the function **returns early** with `credits_remaining: 0` (line 93-101). This happens BEFORE the manual subscription check and ledger query, so students using Zelle/manual payments always see 0 credits even though the ledger has the correct balance.

The flow currently is:
```text
1. Look up Stripe customer by email
2. No Stripe customer found? --> RETURN { credits_remaining: 0 }  <-- BUG: exits here
3. Check manual subscriptions  <-- never reached
4. Query ledger for credits    <-- never reached
```

## Fix

Restructure the function so that when no Stripe customer is found, it does NOT return early. Instead, it continues to check for manual subscriptions and always queries the ledger.

### File: `supabase/functions/check-subscription/index.ts`

**Before (lines 91-101):**
```typescript
const customers = await stripe.customers.list({ email: user.email, limit: 1 });

if (customers.data.length === 0) {
  logStep("No customer found, updating unsubscribed state");
  return new Response(JSON.stringify({ 
    subscribed: false,
    credits_remaining: 0 
  }), { ... });
}
```

**After:**
```typescript
const customers = await stripe.customers.list({ email: user.email, limit: 1 });

if (customers.data.length === 0) {
  logStep("No Stripe customer found, checking manual subscriptions and ledger");
  // Do NOT return early -- fall through to manual subscription + ledger checks
}
```

The rest of the function already handles the case where `activeOrPausedSub` is null (it checks for manual subscriptions). The only change needed is:

1. Remove the early return when no Stripe customer is found
2. Guard the Stripe subscription lookup to only run when a customer exists
3. The ledger query and manual subscription check already handle the no-Stripe-customer case correctly

### Detailed Changes

| Section | Change |
|---------|--------|
| Lines 93-101 | Remove the early `return` statement; replace with a log and let execution continue |
| Lines 108-117 | Wrap Stripe subscription list call in `if (customers.data.length > 0)` guard |
| Deploy | Redeploy `check-subscription` edge function |

### Corrected Flow
```text
1. Look up Stripe customer by email
2. No Stripe customer? --> log it, continue
3. Has Stripe customer? --> check Stripe subscriptions
4. No active Stripe sub? --> check manual subscriptions
5. ALWAYS query ledger for credits (single source of truth)
6. Return combined result
```

This ensures manual/Zelle students get their correct credit balance from the ledger regardless of Stripe customer status.

