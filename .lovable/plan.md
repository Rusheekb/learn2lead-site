
## Credit Pack Renewal System Migration

### Overview
Replace the current monthly subscription model with a one-time credit pack purchase system (4/8/12 credits). Students buy credits when they need them -- no recurring billing, no pause/resume complexity, no overdraw scenarios. When credits run low or hit 0, students simply purchase another pack.

### What Changes for Students
- Instead of "$140/month for 4 classes", they buy "4 Credit Pack for $140" (one-time)
- No monthly billing cycle -- use credits at their own pace
- No need to pause/resume for vacations
- When credits are low or at 0, they see a prompt to buy more
- Zelle (manual) credit allocation continues to work as-is

---

### Phase 1: Create New Stripe Products

Using Stripe tools, create 3 new one-time price objects:
- **4 Credit Pack** -- $140 (one-time)
- **8 Credit Pack** -- $240 (one-time)
- **12 Credit Pack** -- $300 (one-time)

### Phase 2: Update Stripe Configuration

**File: `src/config/stripe.ts`**
- Replace subscription price IDs with new one-time price IDs
- Update plan config labels: remove "/month" language, reframe as credit packs
- Change `monthlyTotal` to just the pack price (e.g., "$140")
- Update descriptions to reflect buy-as-needed model

### Phase 3: Update Checkout Edge Function

**File: `supabase/functions/create-checkout/index.ts`**
- Change `mode: "subscription"` to `mode: "payment"` (one-time)
- Keep referral code/coupon logic (works the same with one-time payments)
- Update success/cancel URLs

### Phase 4: Update Webhook Handler

**File: `supabase/functions/stripe-webhooks/index.ts`**
- Replace `invoice.payment_succeeded` handler with `checkout.session.completed` credit allocation logic
- On successful one-time payment: look up the price ID, find the matching plan, add credits to the ledger
- Remove subscription lifecycle handlers: `customer.subscription.deleted`, `customer.subscription.updated`, `customer.subscription.paused`, `customer.subscription.resumed`
- Remove `invoice.payment_failed` handler (no recurring billing to fail)
- Keep referral processing (already on `checkout.session.completed`)
- Send a purchase confirmation email instead of renewal email

### Phase 5: Simplify check-subscription Edge Function

**File: `supabase/functions/check-subscription/index.ts`**
- Remove all Stripe subscription status checks (no more `subscriptions.list`)
- Remove pause/resume detection
- Keep: authenticate user, query ledger for credit balance, return credits
- Rename response concept from "subscribed" to credit-based (though field name can stay for backwards compat)
- Consider the user "active" if they have any ledger history (they've purchased at least once)
- Remove `subscription_end`, `is_paused`, `pause_resumes_at` from response

### Phase 6: Simplify SubscriptionProvider

**File: `src/contexts/SubscriptionContext/SubscriptionProvider.tsx`**
- Remove `isPaused`, `pauseResumesAt`, `subscriptionEnd` from state
- Simplify state to: `creditsRemaining`, `planName`, `pricePerClass`, `isLoading`, `error`
- Reduce polling frequency (credits only change on class completion or purchase, not time-based)

### Phase 7: Update Student Dashboard UI

**File: `src/components/student/SubscriptionStatusCard.tsx`**
- Remove pause/resume buttons and dialog
- Remove "Renewal Date" display
- Remove overdraw warning messages
- When credits are 0: show "Buy More Credits" button linking to /pricing
- When credits are low (1-2): show a gentle prompt to top up
- Remove "Manage Subscription" (Stripe portal) button -- no subscription to manage
- Keep "Upgrade Plan" button but relabel as "Buy Credits"

**File: `src/components/student/PauseSubscriptionDialog.tsx`**
- Delete this component entirely

**File: `src/components/shared/CreditBadge.tsx`**
- Remove negative/overdrawn display logic (credits should never go below 0)
- Simplify to just show remaining credits

### Phase 8: Update Pricing Page

**File: `src/pages/Pricing.tsx`**
- Update copy: "Credit Packs" instead of "Monthly Plans"
- Remove "/month" pricing labels
- Change button text to "Buy 4 Credits", "Buy 8 Credits", "Buy 12 Credits"
- Update subtitle: "Buy credits and use them at your own pace"

### Phase 9: Prevent Negative Balances

**File: `supabase/functions/deduct-class-credit/index.ts`**
- Add a check: if `credits_remaining <= 0`, reject the class completion with a clear error code (`NO_CREDITS`)
- Remove the logic that allows negative balances
- Update response messages accordingly

**File: `src/services/classCompletion.ts`**
- Handle new `NO_CREDITS` error code with a user-friendly message: "Student has no credits remaining. Please purchase more credits."

### Phase 10: Remove Overdraw/Low-Credit Reminder Systems

Delete the following edge functions (they become unnecessary):
- `supabase/functions/pause-subscription/` 
- `supabase/functions/send-overdraw-reminders/`
- `supabase/functions/cron-overdraw-reminders/`
- `supabase/functions/send-low-credit-reminders/`
- `supabase/functions/cron-low-credit-reminders/`

**File: `supabase/config.toml`**
- Remove entries for the deleted functions

### Phase 11: Database Migration

Update the `subscription_plans` table to reflect the new model:
- Update `name` values to "4 Credit Pack", "8 Credit Pack", "12 Credit Pack"
- Update `stripe_price_id` with new one-time price IDs
- Update `stripe_product_id` with new product IDs
- Rename column concept: `classes_per_month` stays but now represents credits per pack

No schema changes needed -- the `class_credits_ledger` and `student_subscriptions` tables work as-is.

### Phase 12: Existing Subscriber Migration

For students with active Stripe subscriptions:
- Their current credits in the ledger remain untouched
- Cancel their Stripe subscriptions at period end via Stripe dashboard
- Communicate the change: "Your remaining credits carry over. When you need more, buy a credit pack."

---

### Technical Details

**Files Created:** None (all modifications to existing files)

**Files Deleted:**
- `src/components/student/PauseSubscriptionDialog.tsx`
- `supabase/functions/pause-subscription/index.ts`
- `supabase/functions/send-overdraw-reminders/index.ts`
- `supabase/functions/cron-overdraw-reminders/index.ts`
- `supabase/functions/send-low-credit-reminders/index.ts`
- `supabase/functions/cron-low-credit-reminders/index.ts`

**Files Modified:**
| File | Change Summary |
|------|---------------|
| `src/config/stripe.ts` | New one-time price IDs, updated plan labels |
| `supabase/functions/create-checkout/index.ts` | `mode: "payment"` instead of `"subscription"` |
| `supabase/functions/stripe-webhooks/index.ts` | Credit allocation on checkout.session.completed, remove subscription lifecycle handlers |
| `supabase/functions/check-subscription/index.ts` | Simplify to ledger-only credit check, remove Stripe subscription queries |
| `supabase/functions/deduct-class-credit/index.ts` | Block deduction at 0 credits (no negatives) |
| `src/contexts/SubscriptionContext/SubscriptionProvider.tsx` | Remove pause/subscription-end state |
| `src/components/student/SubscriptionStatusCard.tsx` | Remove pause/overdraw UI, add "Buy Credits" CTA |
| `src/components/shared/CreditBadge.tsx` | Remove overdrawn display logic |
| `src/services/classCompletion.ts` | Handle NO_CREDITS error |
| `src/pages/Pricing.tsx` | Reframe as credit packs |
| `supabase/config.toml` | Remove deleted function entries |

**Stripe Products to Create:**
- 3 new one-time products + prices (4/8/12 credits at $140/$240/$300)

**Impact on Existing Features:**
- Manual credit allocation (Zelle) -- unchanged, continues working
- Referral system -- works with one-time payments, no changes needed
- Class completion flow -- minor change (reject at 0 instead of allowing negative)
- Tutor payment tracking -- unchanged
- Credit ledger -- unchanged (single source of truth)
