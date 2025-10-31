-- Allow NULLs for period dates so webhook inserts/updates don’t fail when Stripe omits them
ALTER TABLE public.student_subscriptions
  ALTER COLUMN current_period_start DROP NOT NULL,
  ALTER COLUMN current_period_end DROP NOT NULL;