-- Insert initial referral code using the Stripe coupon we created
INSERT INTO public.referral_codes (code, discount_amount, stripe_coupon_id, active)
VALUES ('FRIEND25', 25.00, 'BieEZs5Z', true);