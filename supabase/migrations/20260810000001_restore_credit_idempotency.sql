-- Fixes a real, live gap in restore-class-credit: it does an unlocked, non-idempotent
-- ledger insert, and will restore a credit even when no matching debit is found for
-- the class (only logs a warning and proceeds "for error recovery"). Combined with
-- classCompletion.ts's retry logic, a network hiccup right after complete_class_atomic
-- actually succeeds server-side — but before the client sees the response — causes the
-- client to believe completion failed and call restore-class-credit, resulting in a
-- real over-restore: the class is genuinely logged, but the student also gets the hour
-- credited back for free. Same pattern as apply_credit_ledger_entry, applied to reversal.

ALTER TABLE public.class_credits_ledger
  ADD COLUMN IF NOT EXISTS reversed_debit_id uuid REFERENCES public.class_credits_ledger(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_credits_ledger_reversal_unique
  ON public.class_credits_ledger (reversed_debit_id)
  WHERE reversed_debit_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reverse_class_debit(
  p_student_id uuid,
  p_class_id text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debit_id uuid;
  v_debit_amount integer;
  v_subscription_id uuid;
  v_current integer;
  v_new integer;
  v_ledger_id uuid;
  v_existing_id uuid;
  v_existing_balance integer;
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
$$;

REVOKE ALL ON FUNCTION public.reverse_class_debit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_class_debit TO service_role;
