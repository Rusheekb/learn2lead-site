/**
 * Stripe Configuration
 * 
 * Credit Pack system - one-time purchases (not subscriptions).
 * Students buy packs of hours and use them at their own pace.
 * 1 credit = 1 hour of tutoring. Half-hour increments supported.
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

export const CREDIT_TIERS: CreditTier[] = [
  {
    credits: 1,
    priceId: 'price_1T3VMD14Kl9WjCfljetZW63c',
    total: 40,
    perHour: 40,
    perClass: 40,
    label: '1 Hour',
    savingsPercent: 0,
  },
  {
    credits: 2,
    priceId: 'price_1T3VME14Kl9WjCflQY8WEY97',
    total: 76,
    perHour: 38,
    perClass: 38,
    label: '2 Hours',
    savingsPercent: 5,
  },
  {
    credits: 4,
    priceId: 'price_1T20M714Kl9WjCflVbq3glKt',
    total: 140,
    perHour: 35,
    perClass: 35,
    label: '4 Hours',
    savingsPercent: 13,
  },
  {
    credits: 8,
    priceId: 'price_1T20M714Kl9WjCflDIKczcAX',
    total: 240,
    perHour: 30,
    perClass: 30,
    label: '8 Hours',
    savingsPercent: 25,
  },
  {
    credits: 10,
    priceId: 'price_1T3VMF14Kl9WjCfl0q3uc13H',
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
