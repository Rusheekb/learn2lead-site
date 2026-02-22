

# Dropdown Credit Selector with Tiered Pricing

## Overview
Replace the current 3-column pricing card layout with a single, clean credit selector using a dropdown menu. Users pick how many credits they want (1, 2, 4, 8, or 10), see the price update dynamically, and click one button to checkout.

## Pricing Tiers

| Credits | Total | Per Class |
|---------|-------|-----------|
| 1       | $40   | $40.00    |
| 2       | $76   | $38.00    |
| 4       | $140  | $35.00    |
| 8       | $240  | $30.00    |
| 10      | $280  | $28.00    |

## Implementation Steps

### Step 1: Create Stripe Products and Prices
Create two new Stripe products + prices for the 1-credit ($40) and 2-credit ($76) tiers using the Stripe tools. The existing 4, 8 products/prices stay as-is. The old 12-credit product will be deactivated.

### Step 2: Add new plans to `subscription_plans` table
Insert two new rows for 1-credit and 2-credit packs, and deactivate the 12-credit plan (since 10-credit replaces it). Create a new 10-credit product+price in Stripe and add it to the table as well.

### Step 3: Update `src/config/stripe.ts`
Replace the current `basic/standard/premium` structure with a `CREDIT_TIERS` array containing all 5 options with their price IDs, totals, per-class rates, and credit counts.

### Step 4: Redesign `src/pages/Pricing.tsx`
- Remove the 3-column `PricingTier` card layout
- Add a centered card with:
  - A `<Select>` dropdown (using the existing Radix select component) listing: 1, 2, 4, 8, 10 credits
  - Dynamic price display showing total and per-class rate
  - Feature list (shared across all tiers)
  - A "Buy Credits" button that triggers checkout with the selected tier's price ID
  - A savings badge for higher tiers (e.g., "Save 30%" for 10 credits)
- Keep the existing header, "Contact Us" section, and checkout logic

### Step 5: No changes needed to edge functions
The `create-checkout` edge function already accepts any `priceId` dynamically. The `stripe-webhooks` function looks up the plan by `stripe_price_id` in the `subscription_plans` table, so it will work automatically with the new entries.

---

## Technical Details

**New Stripe resources to create:**
- Product: "1 Credit Pack" with price $40.00 (one-time)
- Product: "2 Credit Pack" with price $76.00 (one-time)  
- Product: "10 Credit Pack" with price $280.00 (one-time)

**Database changes (data only, no schema changes):**
- INSERT 3 new rows into `subscription_plans` for 1, 2, and 10 credit tiers
- UPDATE 12-credit plan to `active = false`

**Files modified:**
- `src/config/stripe.ts` -- new tier structure
- `src/pages/Pricing.tsx` -- dropdown UI replacing card grid

