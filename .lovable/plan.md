

## Auto-Renewal System for Credit Packs

### Overview
Add an optional auto-renewal feature where parents can configure their preferred credit pack to automatically repurchase when credits drop to or below a chosen threshold. Students who prefer manual control can leave auto-renewal disabled (the default).

### How It Works
1. After a class is completed and credits are deducted, the system checks if auto-renewal is enabled for that student
2. If credits fall to or below the configured threshold, the system automatically creates a Stripe Checkout session using the student's saved payment method
3. The student/parent receives an email notification about the auto-renewal charge
4. If auto-renewal fails (e.g., card declined), the student is notified and auto-renewal is paused until they update payment info

### What Parents See
- A new "Auto-Renewal Settings" card on the student dashboard (below the credits card)
- Toggle to enable/disable auto-renewal
- Dropdown to choose which credit pack to auto-renew (4, 8, or 12 credits)
- Input to set the threshold (e.g., "Renew when credits reach 1")
- Clear display of current settings: "When you reach 1 credit, we'll automatically purchase an 8 Credit Pack ($240)"

---

### Phase 1: Database -- New Table

Create an `auto_renewal_settings` table:
- `id` (uuid, PK)
- `student_id` (uuid, references profiles.id, unique)
- `enabled` (boolean, default false)
- `renewal_pack` (text -- 'basic', 'standard', or 'premium')
- `threshold` (integer, default 1 -- renew when credits reach this number)
- `stripe_customer_id` (text, nullable -- cached for quick lookup)
- `last_renewal_at` (timestamptz, nullable)
- `last_renewal_error` (text, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

RLS policies:
- Students can SELECT/UPDATE/INSERT their own row
- Admins can manage all rows

### Phase 2: Auto-Renewal Settings UI

**New component: `src/components/student/AutoRenewalSettings.tsx`**
- Card with toggle switch for enable/disable
- Select dropdown for pack choice (4/8/12 credits)
- Number input for threshold (1-10 range)
- Saves settings to `auto_renewal_settings` table via Supabase client
- Shows last renewal date and any errors
- Warning text: "Your saved payment method on file will be charged automatically"

**Modified: `src/components/student/DashboardContent.tsx`**
- Add `AutoRenewalSettings` component below `SimpleCreditsCounter`

### Phase 3: Trigger Auto-Renewal on Credit Deduction

**Modified: `supabase/functions/deduct-class-credit/index.ts`**
- After successfully deducting a credit, check if `newBalance <= threshold` from `auto_renewal_settings`
- If auto-renewal is enabled and threshold is met:
  - Look up the student's Stripe customer ID
  - Create a Stripe PaymentIntent using their default payment method (not a Checkout session -- this is server-initiated)
  - On success: allocate credits via the same ledger logic used in `stripe-webhooks`
  - On failure: update `last_renewal_error` in settings and send a notification
  - Add a cooldown check: don't re-trigger if `last_renewal_at` is within the last hour (prevents duplicate charges)

### Phase 4: Stripe Setup for Saved Payment Methods

**Modified: `supabase/functions/create-checkout/index.ts`**
- Add `payment_intent_data.setup_future_usage: 'off_session'` to the checkout session config
- This tells Stripe to save the payment method for future use when the student makes their first manual purchase

### Phase 5: Auto-Renewal Edge Function

**New: `supabase/functions/process-auto-renewal/index.ts`**
- Called by `deduct-class-credit` internally (or could be a separate invocation)
- Accepts `student_id` and `renewal_pack`
- Looks up the Stripe customer and their default payment method
- Creates a PaymentIntent with `off_session: true` and `confirm: true`
- On success: inserts a ledger entry and updates `last_renewal_at`
- On failure: updates `last_renewal_error`, sends notification, optionally disables auto-renewal after repeated failures
- Sends confirmation email on successful charge

### Phase 6: Notification & Email

- On successful auto-renewal: send email with receipt details and credit balance
- On failed auto-renewal: send email asking to update payment method, with link to /pricing
- In-app notification for both cases via the existing `notifications` table

---

### Technical Details

**New Files:**
| File | Purpose |
|------|---------|
| `src/components/student/AutoRenewalSettings.tsx` | UI for configuring auto-renewal preferences |
| `supabase/functions/process-auto-renewal/index.ts` | Server-side auto-renewal payment processing |

**Modified Files:**
| File | Change |
|------|--------|
| `supabase/functions/deduct-class-credit/index.ts` | Check threshold and trigger auto-renewal after deduction |
| `supabase/functions/create-checkout/index.ts` | Add `setup_future_usage` to save payment methods |
| `src/components/student/DashboardContent.tsx` | Add AutoRenewalSettings component |
| `supabase/config.toml` | Add `process-auto-renewal` function entry |

**Database Changes:**
- New `auto_renewal_settings` table with RLS policies

**Security Considerations:**
- Auto-renewal charges use Stripe's `off_session` PaymentIntent, which requires the customer to have previously saved a payment method via `setup_future_usage`
- Cooldown period prevents double-charging (1-hour minimum between auto-renewals)
- Students can disable auto-renewal at any time -- takes effect immediately
- Failed charges never block class completion; they only trigger a notification

**No impact on:**
- Manual credit purchases (unchanged)
- Zelle/manual credit allocation (unchanged)
- Tutor payment tracking (unchanged)
- Referral system (unchanged)
