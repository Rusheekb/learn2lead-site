-- Atomic credit ledger writes.
--
-- Every credit/debit call site (deduct-class-credit, the Stripe webhook's checkout
-- allocation + auto-renewal recovery, process-auto-renewal) previously read
-- student_subscriptions.credits_remaining, computed a new balance in app code, then
-- inserted a ledger row with that literal value — with no lock in between. Two
-- concurrent writers for the same student (e.g. a class completion firing while an
-- auto-renewal recovery webhook lands) could both read the same stale balance and
-- silently drop one side's credit/debit. complete_class_atomic already solved this
-- correctly elsewhere with pg_advisory_xact_lock; this applies the same guarantee to
-- the credit ledger via a real row lock on the subscription being mutated.
CREATE OR REPLACE FUNCTION public.apply_credit_ledger_entry(
  p_student_id uuid,
  p_subscription_id uuid,
  p_transaction_type text,
  p_amount integer,
  p_reason text,
  p_related_class_id text DEFAULT NULL,
  p_invoice_id text DEFAULT NULL,
  p_dollar_amount numeric DEFAULT NULL,
  p_allow_negative boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_new integer;
  v_ledger_id uuid;
  v_existing_id uuid;
  v_existing_balance integer;
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
$$;

-- Only service-role edge functions call this — they already perform their own auth
-- checks (tutor/admin role, ownership, etc.) before reaching it.
REVOKE ALL ON FUNCTION public.apply_credit_ledger_entry FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_credit_ledger_entry TO service_role;

-- Defense in depth: make a double-debit for the same class impossible at the DB
-- level, the same way the existing invoice_id unique index prevents double-crediting
-- the same Stripe purchase.
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_credits_ledger_class_debit_unique
  ON public.class_credits_ledger (related_class_id)
  WHERE related_class_id IS NOT NULL AND transaction_type = 'debit';
