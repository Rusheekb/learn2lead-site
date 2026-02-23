

# Make the Pricing Page Parent-Friendly

## Problem
The word "credits" is internal jargon. Parents think in terms of classes, not credits. There is also no mention that unused classes carry over, which is a key selling point.

## Changes (all in `src/pages/Pricing.tsx`)

### 1. Reword the headline and dropdown label
- **Page title**: "Buy Credits" --> "Buy Class Sessions"
- **Subtitle**: "Pick how many credits you need..." --> "Choose how many classes you'd like -- no subscriptions, no commitments."
- **Dropdown label**: "How many credits?" --> "How many classes?"
- **Dropdown items**: "1 Credit" --> "1 Class", "2 Credits" --> "2 Classes", etc. (update labels in `src/config/stripe.ts`)
- **Button text**: "Buy 4 Credits" --> "Buy 4 Classes"

### 2. Add a "Classes never expire" callout
Below the dropdown card, add a small reassurance banner:
> "Unused classes carry over -- buy now, use whenever your schedule allows."

This will be styled as a subtle info box (light blue/gray background, small text) sitting just beneath the main card.

### 3. Add a "How It Works" section
Below the card (above the "Need something different?" block), add three simple steps to demystify the process for parents:

1. **Choose your pack** -- Pick the number of classes that works for your family.
2. **Schedule anytime** -- Book sessions at times that fit your calendar.
3. **Classes never expire** -- Unused sessions carry over, so nothing goes to waste.

### 4. Additional recommendations (included)
- **Add a short FAQ accordion** at the bottom with 3 common parent questions:
  - "What is a class session?" -- A one-hour, one-on-one tutoring session in any subject.
  - "Do unused classes expire?" -- No. Your classes carry over indefinitely.
  - "Can I buy more classes later?" -- Yes, you can top up anytime.
- **Replace "per class" with "per session"** in the price display for consistency with the new language.

## Files modified
- `src/config/stripe.ts` -- Change `label` values from "X Credits" to "X Classes"
- `src/pages/Pricing.tsx` -- All UI copy changes, "How It Works" section, carryover callout, and FAQ accordion

## No backend or Stripe changes needed
This is purely a front-end copy and layout update.

