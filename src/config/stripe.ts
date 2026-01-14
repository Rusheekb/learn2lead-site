/**
 * Stripe Configuration
 * 
 * This file centralizes all Stripe-related configuration including price IDs
 * and product IDs for easy management when switching between test and live modes.
 * 
 * IMPORTANT: When switching to live mode:
 * 1. Update the price IDs below with your live mode Stripe price IDs
 * 2. Update STRIPE_SECRET_KEY in Supabase Secrets
 * 3. Update STRIPE_WEBHOOK_SECRET in Supabase Secrets
 * 4. Update subscription_plans table with live stripe_price_id and stripe_product_id
 */

// Price IDs for subscription plans
// Replace these with live mode price IDs when going to production
export const STRIPE_PRICE_IDS = {
  basic: 'price_1SpbGd1fzLklBERMn8JbKczH',    // $140/month - Basic Plan (4 classes)
  standard: 'price_1SpbGq1fzLklBERM8W5mMeOx', // $240/month - Standard Plan (8 classes)
  premium: 'price_1SpbIv1fzLklBERMHinrOG9F',  // $300/month - Premium Plan (12 classes)
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
    name: 'Basic',
    pricePerClass: '$35/class',
    monthlyTotal: '$140/month',
    description: 'Perfect for beginners looking to improve in one subject',
    features: [
      'Access to one subject area',
      '4 classes per month',
      'Basic study materials',
      'Email support',
    ],
    buttonText: 'Get Started',
    highlighted: false,
  },
  standard: {
    name: 'Standard',
    pricePerClass: '$30/class',
    monthlyTotal: '$240/month',
    description: 'Our most popular plan for dedicated students',
    features: [
      'Access to all subject areas',
      '8 classes per month',
      'Advanced study materials',
      'Practice tests and assessments',
      'Priority email support',
    ],
    buttonText: 'Choose Standard',
    highlighted: true,
  },
  premium: {
    name: 'Premium',
    pricePerClass: '$25/class',
    monthlyTotal: '$300/month',
    description: 'Comprehensive support for academic excellence',
    features: [
      'Access to all subject areas',
      '12 classes per month',
      'Premium study materials',
      'Personalized study plan',
      'Practice tests and assessments',
      '1-on-1 counseling sessions',
      '24/7 priority support',
    ],
    buttonText: 'Choose Premium',
    highlighted: false,
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PRICE_IDS;
