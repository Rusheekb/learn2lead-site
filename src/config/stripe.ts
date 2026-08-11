/**
 * Stripe Configuration
 *
 * Credit Pack system - one-time purchases (not subscriptions).
 * Students buy packs of hours and use them at their own pace.
 * 1 credit = 1 hour of tutoring. Half-hour increments supported.
 *
 * Set VITE_STRIPE_MODE=test in .env to use test-mode prices.
 */

export type CreditTier = {
  credits: number;
  priceId: string;
  total: number;
  perHour: number;
  label: string;
  savingsPercent: number; // vs single-hour price
};

// Stripe mode: 'test' or 'live'
export const STRIPE_MODE: 'test' | 'live' =
  (import.meta.env.VITE_STRIPE_MODE as string)?.toLowerCase() === 'test'
    ? 'test'
    : 'live';

export const isTestMode = STRIPE_MODE === 'test';

const LIVE_PRICE_IDS = {
  4: 'price_1T20M714Kl9WjCflVbq3glKt',
  8: 'price_1T20M714Kl9WjCflDIKczcAX',
  // Created in the same original batch as the 4hr/8hr prices above (one second
  // apart) but never wired in until now — a pre-existing gap, not new.
  12: 'price_1T20M914Kl9WjCfl608OYEiB',
} as const;

const TEST_PRICE_IDS = {
  4: 'price_1TEZyQ14Kl9WjCflTtGqGEYL',
  8: 'price_1TEZyh14Kl9WjCflk6c1kecm',
  12: 'price_1U2dWQ14Kl9WjCflWFNOL354',
} as const;

const priceIds = isTestMode ? TEST_PRICE_IDS : LIVE_PRICE_IDS;

export const CREDIT_TIERS: CreditTier[] = [
  {
    credits: 4,
    priceId: priceIds[4],
    total: 140,
    perHour: 35,
    label: '4 Hours',
    savingsPercent: 0,
  },
  {
    credits: 8,
    priceId: priceIds[8],
    total: 240,
    perHour: 30,
    label: '8 Hours',
    savingsPercent: 14,
  },
  {
    credits: 12,
    priceId: priceIds[12],
    total: 300,
    perHour: 25,
    label: '12 Hours',
    savingsPercent: 29,
  },
];

// Default selected tier (8 hours - best seller)
export const DEFAULT_TIER_INDEX = 1;

// Legacy exports for backward compatibility
export const STRIPE_PRICE_IDS = {
  basic: CREDIT_TIERS[0].priceId,
  standard: CREDIT_TIERS[1].priceId,
  premium: CREDIT_TIERS[2].priceId,
} as const;

export const STRIPE_PLAN_PRICES = {
  basic: 140,
  standard: 240,
  premium: 300,
} as const;

export type StripePlanKey = keyof typeof STRIPE_PRICE_IDS;
