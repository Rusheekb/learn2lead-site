-- Bug found during Group 4 review: class_credits_ledger.amount/balance_after
-- and student_subscriptions.credits_remaining/credits_allocated were all
-- `integer`, but deduct-class-credit (shipped earlier tonight) computes
-- fractional hours via roundToHalfHour() and passes them straight into
-- apply_credit_ledger_entry's p_amount — meaning any tutor completing a
-- class with a non-whole-number duration (1.5h, 2.5h, etc.) gets a hard
-- failure on the ledger insert. Widening to numeric(6,2) throughout.

-- credit_discrepancies depends on class_credits_ledger.balance_after and
-- student_subscriptions.credits_remaining, so it has to come down before
-- those columns can change type and get recreated identically after
-- (same definition, same security_invoker=true).
DROP VIEW IF EXISTS public.credit_discrepancies;

ALTER TABLE public.class_credits_ledger
  ALTER COLUMN amount TYPE numeric(6,2),
  ALTER COLUMN balance_after TYPE numeric(6,2);

ALTER TABLE public.student_subscriptions
  ALTER COLUMN credits_remaining TYPE numeric(6,2),
  ALTER COLUMN credits_allocated TYPE numeric(6,2);

CREATE VIEW public.credit_discrepancies
WITH (security_invoker = true) AS
 SELECT ss.student_id,
    ss.id AS subscription_id,
    ss.credits_remaining AS subscription_credits,
    COALESCE(( SELECT class_credits_ledger.balance_after
           FROM class_credits_ledger
          WHERE class_credits_ledger.student_id = ss.student_id AND class_credits_ledger.subscription_id = ss.id
          ORDER BY class_credits_ledger.created_at DESC
         LIMIT 1), 0) AS ledger_credits,
    ss.credits_remaining - COALESCE(( SELECT class_credits_ledger.balance_after
           FROM class_credits_ledger
          WHERE class_credits_ledger.student_id = ss.student_id AND class_credits_ledger.subscription_id = ss.id
          ORDER BY class_credits_ledger.created_at DESC
         LIMIT 1), 0) AS difference
   FROM student_subscriptions ss
  WHERE (ss.status = ANY (ARRAY['active'::text, 'trialing'::text])) AND ss.credits_remaining <> COALESCE(( SELECT class_credits_ledger.balance_after
           FROM class_credits_ledger
          WHERE class_credits_ledger.student_id = ss.student_id AND class_credits_ledger.subscription_id = ss.id
          ORDER BY class_credits_ledger.created_at DESC
         LIMIT 1), 0);

-- Changing a parameter's type isn't a like-for-like CREATE OR REPLACE — it's
-- a different signature, so the old integer-typed overload must be dropped
-- explicitly or it would linger alongside the new one.
DROP FUNCTION IF EXISTS public.apply_credit_ledger_entry(uuid, uuid, text, integer, text, text, text, numeric, boolean);

CREATE OR REPLACE FUNCTION public.apply_credit_ledger_entry(p_student_id uuid, p_subscription_id uuid, p_transaction_type text, p_amount numeric, p_reason text, p_related_class_id text DEFAULT NULL::text, p_invoice_id text DEFAULT NULL::text, p_dollar_amount numeric DEFAULT NULL::numeric, p_allow_negative boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current numeric(6,2);
  v_new numeric(6,2);
  v_ledger_id uuid;
  v_existing_id uuid;
  v_existing_balance numeric(6,2);
BEGIN
  -- Idempotency for retried Stripe events (same invoice/payment intent).
  IF p_invoice_id IS NOT NULL THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
    FROM public.class_credits_ledger
    WHERE invoice_id = p_invoice_id;

    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
    END IF;
  END IF;

  -- Idempotency for a class being completed twice.
  IF p_related_class_id IS NOT NULL AND p_transaction_type = 'debit' THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
    FROM public.class_credits_ledger
    WHERE related_class_id = p_related_class_id AND transaction_type = 'debit';

    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
    END IF;
  END IF;

  -- Row lock held until this transaction commits — concurrent callers for the same
  -- subscription serialize here instead of racing on a stale read.
  SELECT credits_remaining INTO v_current
  FROM public.student_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'subscription_not_found');
  END IF;

  v_new := v_current + p_amount;

  IF NOT p_allow_negative AND v_new < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'current_balance', v_current);
  END IF;

  INSERT INTO public.class_credits_ledger (
    student_id, subscription_id, transaction_type, amount,
    balance_after, reason, related_class_id, invoice_id, dollar_amount
  ) VALUES (
    p_student_id, p_subscription_id, p_transaction_type, p_amount,
    v_new, p_reason, p_related_class_id, p_invoice_id, p_dollar_amount
  )
  RETURNING id INTO v_ledger_id;

  -- student_subscriptions.credits_remaining is kept in sync by the existing
  -- sync_credits_after_ledger_insert trigger, which fires within this same
  -- transaction and therefore under the same row lock.

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'ledger_id', v_ledger_id, 'new_balance', v_new);

EXCEPTION WHEN unique_violation THEN
  -- Two concurrent callers for the *same* invoice/class both passed the pre-check
  -- above before either committed. Whichever loses the race lands here instead of
  -- double-crediting/double-debiting — look up what the winner wrote and return it.
  IF p_invoice_id IS NOT NULL THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
    FROM public.class_credits_ledger WHERE invoice_id = p_invoice_id;
  ELSE
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
    FROM public.class_credits_ledger
    WHERE related_class_id = p_related_class_id AND transaction_type = 'debit';
  END IF;
  RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_credit_ledger_entry(uuid, uuid, text, numeric, text, text, text, numeric, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_ledger_entry(uuid, uuid, text, numeric, text, text, text, numeric, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.reverse_class_debit(p_student_id uuid, p_class_id text, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_debit_id uuid;
  v_debit_amount numeric(6,2);
  v_subscription_id uuid;
  v_current numeric(6,2);
  v_new numeric(6,2);
  v_ledger_id uuid;
  v_existing_id uuid;
  v_existing_balance numeric(6,2);
BEGIN
  -- The class really is logged — the debit was correct, never reverse it,
  -- regardless of what the client thinks happened.
  IF EXISTS (SELECT 1 FROM public.class_logs WHERE "Class ID" = p_class_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'class_already_completed');
  END IF;

  SELECT id, amount, subscription_id INTO v_debit_id, v_debit_amount, v_subscription_id
  FROM public.class_credits_ledger
  WHERE related_class_id = p_class_id AND transaction_type = 'debit'
  LIMIT 1;

  IF v_debit_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_debit_found');
  END IF;

  -- Idempotency: this debit was already reversed once, don't do it again.
  SELECT id, balance_after INTO v_existing_id, v_existing_balance
  FROM public.class_credits_ledger
  WHERE reversed_debit_id = v_debit_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
  END IF;

  SELECT credits_remaining INTO v_current
  FROM public.student_subscriptions
  WHERE id = v_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'subscription_not_found');
  END IF;

  v_new := v_current - v_debit_amount; -- debit amount is stored negative, so this adds it back

  INSERT INTO public.class_credits_ledger (
    student_id, subscription_id, transaction_type, amount, balance_after, reason, related_class_id, reversed_debit_id
  ) VALUES (
    p_student_id, v_subscription_id, 'credit', -v_debit_amount, v_new, p_reason, p_class_id, v_debit_id
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'ledger_id', v_ledger_id, 'new_balance', v_new);

EXCEPTION WHEN unique_violation THEN
  SELECT id, balance_after INTO v_existing_id, v_existing_balance
  FROM public.class_credits_ledger WHERE reversed_debit_id = v_debit_id;
  RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
END;
$function$;

REVOKE ALL ON FUNCTION public.reverse_class_debit(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_class_debit(uuid, text, text) TO service_role;
