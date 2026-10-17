-- Self-service referral codes are moving from a flat $25 discount to a
-- percentage (15%), sized against real tutor-cost margins per pack tier.
-- Admin-created promo codes stay dollar-based (a separate use case — one-off
-- marketing campaigns, not the peer referral program). discount_amount now
-- means "dollars off" when discount_type = 'fixed', or "percent off" when
-- discount_type = 'percent'. Existing codes default to 'fixed' since they
-- were all created under the old flat-dollar terms and keep those terms.
ALTER TABLE public.referral_codes
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'fixed'
    CHECK (discount_type IN ('fixed', 'percent'));
