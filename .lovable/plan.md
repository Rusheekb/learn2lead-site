

# Duration-Based Credits with Half-Hour Support

## Overview
Change the credit system from "1 credit per class" to "1 credit per hour," supporting half-hour increments (0.5, 1.0, 1.5, 2.0, etc.). A 1.5-hour session deducts 1.5 credits.

## Database Migration (schema change required)
The `amount` column in `class_credits_ledger` and `credits_remaining`/`credits_allocated` in `student_subscriptions` are currently `integer`. They must be changed to `numeric` to store values like 0.5 and 1.5.

```sql
ALTER TABLE class_credits_ledger ALTER COLUMN amount TYPE numeric;
ALTER TABLE class_credits_ledger ALTER COLUMN balance_after TYPE numeric;
ALTER TABLE student_subscriptions ALTER COLUMN credits_remaining TYPE numeric;
ALTER TABLE student_subscriptions ALTER COLUMN credits_allocated TYPE numeric;
```

No data loss -- existing integer values are valid numerics.

## Edge Function: `deduct-class-credit`
- Accept `duration_hours` in the request body (number, e.g. 1.5)
- Default to 1 if not provided (backward compatibility)
- Round to nearest 0.5: `Math.round(duration * 2) / 2` (so 1.3 becomes 1.5, 0.8 becomes 1.0)
- Minimum deduction: 0.5
- Deduct that amount instead of hardcoded 1
- Block if `credits_remaining < creditsToDeduct`
- Update ledger `amount` to `-creditsToDeduct` and `balance_after` accordingly
- Update all response messages to show the deducted amount

## Edge Function: `restore-class-credit`
- Accept `credits_to_restore` in the request body (number, default 1)
- Restore that amount instead of hardcoded 1
- Update ledger and response accordingly

## Frontend: `src/services/classCompletion.ts`
- Pass `duration_hours: parseFloat(data.timeHrs) || 1` in the request body to `deduct-class-credit`
- Pass `credits_to_restore: parseFloat(data.timeHrs) || 1` when calling `restore-class-credit` on failure
- Update success toast messages from "X classes remaining" to "X hours remaining"

## Config: `src/config/stripe.ts`
- Update labels: "1 Class" becomes "1 Hour", "2 Classes" becomes "2 Hours", etc.
- Rename `perClass` to `perHour` (keep `perClass` as alias for backward compat)

## Pricing Page: `src/pages/Pricing.tsx`
- Update headline to "Buy Tutoring Hours"
- Update dropdown label to "How many hours?"
- Update button text to "Buy X Hours"
- Update price display to "per hour" instead of "per session"
- Update savings line to compare against single-hour price
- Update FAQ:
  - "What is a credit?" -- "Each credit equals one hour of tutoring. A 1.5-hour session uses 1.5 credits."
  - Add a question: "What if my session is shorter or longer than an hour?" -- "Credits are deducted in half-hour increments. A 30-minute session uses 0.5 credits; a 90-minute session uses 1.5."
- Update "How It Works" step 1 to mention hours

## Student Components
- `SimpleCreditsCounter.tsx`: Change "Credits Available" to "Hours Available"
- `CreditBadge.tsx`: Change "X classes remaining" to "X hours remaining"; handle decimal display (e.g. "4.5 hours remaining")
- `AutoRenewalSettings.tsx`: Update labels from "credits" to "hours" throughout
- `SubscriptionProvider.tsx`: No changes needed (already passes numeric values through)

## Files Modified
| File | Change |
|------|--------|
| `supabase/functions/deduct-class-credit/index.ts` | Duration-based deduction with 0.5 rounding |
| `supabase/functions/restore-class-credit/index.ts` | Variable credit restoration amount |
| `src/services/classCompletion.ts` | Pass `duration_hours` and `credits_to_restore` |
| `src/config/stripe.ts` | Labels: Classes to Hours |
| `src/pages/Pricing.tsx` | Copy: hours-based language, updated FAQ |
| `src/components/student/SimpleCreditsCounter.tsx` | "Hours Available" |
| `src/components/shared/CreditBadge.tsx` | "X hours remaining", decimal support |
| `src/components/student/AutoRenewalSettings.tsx` | "hours" labels |

## Database migration (1 migration file)
- ALTER 4 columns from `integer` to `numeric`

