-- Add dollar_amount to class_credits_ledger so students can see what they paid.
-- Nullable: existing rows and admin-allocated credits have no associated payment.
ALTER TABLE public.class_credits_ledger
  ADD COLUMN IF NOT EXISTS dollar_amount NUMERIC(10, 2);
