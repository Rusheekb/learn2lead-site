/**
 * Stripe Configuration
 * 
 * Credit Pack system - one-time purchases (not subscriptions).
 * Students buy packs of 1–10 credits and use them at their own pace.
 */

export type CreditTier = {
  credits: number;
  priceId: string;
  total: number;
  perClass: number;
  label: string;
  savingsPercent: number; // vs single-class price
};

export const CREDIT_TIERS: CreditTier[] = [
  {
    credits: 1,
    priceId: 'price_1T3VMD14Kl9WjCfljetZW63c',
    total: 40,
    perClass: 40,
    label: '1 Class',
    savingsPercent: 0,
  },
  {
    credits: 2,
    priceId: 'price_1T3VME14Kl9WjCflQY8WEY97',
    total: 76,
    perClass: 38,
    label: '2 Classes',
    savingsPercent: 5,
  },
  {
    credits: 4,
    priceId: 'price_1T20M714Kl9WjCflVbq3glKt',
    total: 140,
    perClass: 35,
    label: '4 Classes',
    savingsPercent: 13,
  },
  {
    credits: 8,
    priceId: 'price_1T20M714Kl9WjCflDIKczcAX',
    total: 240,
    perClass: 30,
    label: '8 Classes',
    savingsPercent: 25,
  },
  {
    credits: 10,
    priceId: 'price_1T3VMF14Kl9WjCfl0q3uc13H',
    total: 280,
    perClass: 28,
    label: '10 Classes',
    savingsPercent: 30,
  },
];

// Default selected tier (8 credits - best seller)
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
