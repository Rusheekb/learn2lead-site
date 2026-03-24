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
  /** @deprecated Use perHour */
  perClass: number;
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
  1: 'price_1T3VMD14Kl9WjCfljetZW63c',
  2: 'price_1T3VME14Kl9WjCflQY8WEY97',
  4: 'price_1T20M714Kl9WjCflVbq3glKt',
  8: 'price_1T20M714Kl9WjCflDIKczcAX',
  10: 'price_1T3VMF14Kl9WjCfl0q3uc13H',
} as const;

const TEST_PRICE_IDS = {
  1: 'price_1TEZwr14Kl9WjCflCJO1JuLU',
  2: 'price_1TEZy714Kl9WjCfl7YUFnRM3',
  4: 'price_1TEZyQ14Kl9WjCflTtGqGEYL',
  8: 'price_1TEZyh14Kl9WjCflk6c1kecm',
  10: 'price_1TEZyu14Kl9WjCfluumnEvC0',
} as const;

const priceIds = isTestMode ? TEST_PRICE_IDS : LIVE_PRICE_IDS;

export const CREDIT_TIERS: CreditTier[] = [
  {
    credits: 1,
    priceId: priceIds[1],
    total: 40,
    perHour: 40,
    perClass: 40,
    label: '1 Hour',
    savingsPercent: 0,
  },
  {
    credits: 2,
    priceId: priceIds[2],
    total: 76,
    perHour: 38,
    perClass: 38,
    label: '2 Hours',
    savingsPercent: 5,
  },
  {
    credits: 4,
    priceId: priceIds[4],
    total: 140,
    perHour: 35,
    perClass: 35,
    label: '4 Hours',
    savingsPercent: 13,
  },
  {
    credits: 8,
    priceId: priceIds[8],
    total: 240,
    perHour: 30,
    perClass: 30,
    label: '8 Hours',
    savingsPercent: 25,
  },
  {
    credits: 10,
    priceId: priceIds[10],
    total: 280,
    perHour: 28,
    perClass: 28,
    label: '10 Hours',
    savingsPercent: 30,
  },
];

// Default selected tier (8 hours - best seller)
export const DEFAULT_TIER_INDEX = 3;

// Legacy exports for backward compatibility
export const STRIPE_PRICE_IDS = {
  basic: CREDIT_TIERS[2].priceId,
  standard: CREDIT_TIERS[3].priceId,
  premium: CREDIT_TIERS[4].priceId,
} as const;

export const STRIPE_PLAN_PRICES = {
  basic: 140,
  standard: 240,
  premium: 280,
} as const;

export type StripePlanKey = keyof typeof STRIPE_PRICE_IDS;
