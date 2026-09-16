-- Ariana Rayi's student_subscriptions row was originally bootstrapped
-- manually (synthetic manual_* stripe ids, plan_id NULL) before she ever
-- paid through Stripe. Her real Aug 24 2026 purchase of the "12 Credit
-- Pack" ($25/hr) topped up credits_remaining correctly via
-- apply_credit_ledger_entry, but stripe-webhooks only sets plan_id when
-- creating a brand-new subscription row, not when crediting an existing
-- one (fixed alongside this migration in stripe-webhooks/index.ts) - so
-- her price has been NULL ever since, silently producing a $0 Class Cost
-- on every class logged against this subscription.
--
-- trg_enforce_class_logs_update_columns blocks any class_logs UPDATE from
-- a session with no resolvable auth.uid() (i.e. this migration's own
-- connection), so it's scoped off for the two corrected rows only.

ALTER TABLE public.class_logs DISABLE TRIGGER trg_enforce_class_logs_update_columns;

UPDATE public.student_subscriptions
SET plan_id = '0a165a68-69b2-4318-aa74-ca843a9398e6' -- 12 Credit Pack, $25/hr
WHERE id = 'ce4d6310-8a81-459e-9261-6df79bd1780d'
  AND plan_id IS NULL;

-- Both rows confirmed unpaid to tutor and not disputed before correcting.
UPDATE public.class_logs
SET "Class Cost" = 25.00
WHERE "Class ID" IN (
  'b40dbded-e4d8-41e8-94d0-bb3c64e69094', -- Sep 8, 2026, 1hr
  '0fb99d9f-9cc7-49b3-9d26-4130eb558dc7'  -- Sep 10, 2026, 1hr
)
AND "Class Cost" IS NULL;

ALTER TABLE public.class_logs ENABLE TRIGGER trg_enforce_class_logs_update_columns;
