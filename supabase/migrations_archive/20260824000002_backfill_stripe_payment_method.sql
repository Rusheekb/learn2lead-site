-- One-time backfill: students.payment_method still reads its 'zelle' default
-- for every student who made a genuine Stripe credit-pack purchase before the
-- fix in stripe-webhooks/index.ts (markStudentAsStripePayer) started setting
-- it going forward.
--
-- Matched against class_credits_ledger.invoice_id rather than
-- student_subscriptions.stripe_subscription_id: a student whose subscription
-- row already existed (created by an earlier manual/legacy path) before their
-- first real Stripe purchase keeps that row's original stripe_subscription_id
-- forever — allocateCreditsFromCheckout only stamps a fresh 'purchase_%' id
-- when it inserts a brand new row, not when it tops up an existing one. The
-- ledger's invoice_id is always the literal Stripe Checkout Session id
-- ('cs_live_...'/'cs_test_...') for that specific purchase regardless of
-- which case applies, so it's the reliable signal.
--
-- lower()-compares emails, matching the .ilike() case-insensitive lookup the
-- webhook itself uses when resolving a profile by email.
--
-- Idempotent and safe to re-run: only ever moves zelle/NULL -> stripe for
-- students with at least one real Stripe purchase in their ledger; never
-- touches a student with no such match, so genuine Zelle-only students are
-- untouched.
UPDATE public.students s
SET payment_method = 'stripe'
WHERE COALESCE(s.payment_method, 'zelle') != 'stripe'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.class_credits_ledger l ON l.student_id = p.id
    WHERE lower(p.email) = lower(s.email)
      AND (l.invoice_id LIKE 'cs_live_%' OR l.invoice_id LIKE 'cs_test_%')
  );
