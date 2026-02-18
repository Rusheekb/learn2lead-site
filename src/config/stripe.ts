/**
 * Stripe Configuration
 * 
 * Credit Pack system - one-time purchases (not subscriptions).
 * Students buy packs of 4, 8, or 12 credits and use them at their own pace.
 */

// Price IDs for credit packs (one-time payments)
export const STRIPE_PRICE_IDS = {
  basic: 'price_1T20M714Kl9WjCflVbq3glKt',    // $140 - 4 Credit Pack
  standard: 'price_1T20M714Kl9WjCflDIKczcAX', // $240 - 8 Credit Pack
  premium: 'price_1T20M914Kl9WjCfl608OYEiB',  // $300 - 12 Credit Pack
} as const;

// Plan pricing details
export const STRIPE_PLAN_PRICES = {
  basic: 140,
  standard: 240,
  premium: 300,
} as const;

// Plan display configuration
export const STRIPE_PLAN_CONFIG = {
  basic: {
    name: '4 Credit Pack',
    pricePerClass: '$35/class',
    monthlyTotal: '$140',
    description: 'Perfect for getting started or topping up a few classes',
    features: [
      '4 tutoring credits',
      'Use at your own pace',
      'No expiration date',
      'Access to all subjects',
    ],
    buttonText: 'Buy 4 Credits',
    highlighted: false,
  },
  standard: {
    name: '8 Credit Pack',
    pricePerClass: '$30/class',
    monthlyTotal: '$240',
    description: 'Our most popular pack — great value for regular learners',
    features: [
      '8 tutoring credits',
      'Use at your own pace',
      'No expiration date',
      'Access to all subjects',
      'Priority scheduling',
    ],
    buttonText: 'Buy 8 Credits',
    highlighted: true,
  },
  premium: {
    name: '12 Credit Pack',
    pricePerClass: '$25/class',
    monthlyTotal: '$300',
    description: 'Best value — ideal for dedicated students',
    features: [
      '12 tutoring credits',
      'Use at your own pace',
      'No expiration date',
      'Access to all subjects',
      'Priority scheduling',
      'Personalized study plan',
      '24/7 priority support',
    ],
    buttonText: 'Buy 12 Credits',
    highlighted: false,
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PRICE_IDS;
