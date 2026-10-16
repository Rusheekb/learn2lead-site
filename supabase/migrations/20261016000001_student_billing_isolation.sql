-- Family accounts, step 3: a student whose parent pays never sees billing.
-- See docs/family-accounts-plan.md ("Next phase", Phase A).
--
-- Enforced in the database, not just hidden in the UI. A student with a
-- parent can't read the ledger (purchases, amounts paid, invoice ids),
-- subscriptions (plan, price, Stripe customer) or auto-renew settings
-- directly; they get their class usage from get_my_hours_activity(), and the
-- hours remaining only if their parent allows it. Students without a parent
-- (every pre-existing account) keep exactly the access they had.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_hours_from_student boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.hide_hours_from_student IS
  'Set by the student''s parent: the student doesn''t see the family''s hours remaining.';

-- Whether this account has a parent. Used in RLS policies, so every role may
-- run it; it only answers yes/no about the id it's given.
CREATE OR REPLACE FUNCTION public.has_guardian(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.guardian_links WHERE student_id = p_user_id);
$function$;

REVOKE ALL ON FUNCTION public.has_guardian(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_guardian(uuid) TO anon, authenticated, service_role;

-- ─── Direct table access ────────────────────────────────────────────────────
-- Same policies as before plus "and no parent" on the student's own access.

ALTER POLICY admin_or_own_credits_ledger ON public.class_credits_ledger
  USING (
    (auth.role() = 'authenticated'::text)
    AND (
      (get_auth_user_role() = 'admin'::text)
      OR (student_id = auth.uid() AND NOT public.has_guardian(auth.uid()))
    )
  );

ALTER POLICY admin_full_access_subscriptions ON public.student_subscriptions
  USING (
    (auth.role() = 'authenticated'::text)
    AND (
      (get_auth_user_role() = 'admin'::text)
      OR (student_id = auth.uid() AND NOT public.has_guardian(auth.uid()))
    )
  );

ALTER POLICY "Students can view their own auto-renewal settings" ON public.auto_renewal_settings
  USING (student_id = auth.uid() AND NOT public.has_guardian(auth.uid()));
ALTER POLICY "Students can update their own auto-renewal settings" ON public.auto_renewal_settings
  USING (student_id = auth.uid() AND NOT public.has_guardian(auth.uid()));
ALTER POLICY "Students can insert their own auto-renewal settings" ON public.auto_renewal_settings
  WITH CHECK (student_id = auth.uid() AND NOT public.has_guardian(auth.uid()));

-- ─── What a student with a parent gets instead ──────────────────────────────

-- Their class usage: classes charged and hours restored — never purchases,
-- amounts paid or invoice ids. The running balance only if the parent allows.
CREATE OR REPLACE FUNCTION public.get_my_hours_activity(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  amount numeric,
  reason text,
  balance_after numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.id, l.created_at, l.amount, l.reason,
         CASE WHEN me.hide_hours_from_student THEN NULL ELSE l.balance_after END
  FROM public.class_credits_ledger l
  JOIN public.profiles me ON me.id = auth.uid()
  WHERE l.student_id = auth.uid()
    AND (l.transaction_type = 'debit' OR l.reversed_debit_id IS NOT NULL)
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$function$;

REVOKE ALL ON FUNCTION public.get_my_hours_activity(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_hours_activity(integer) TO authenticated;

-- The parent's switch.
CREATE OR REPLACE FUNCTION public.set_student_hours_visibility(p_student_id uuid, p_visible boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_your_child');
  END IF;
  UPDATE public.profiles
  SET hide_hours_from_student = NOT COALESCE(p_visible, true), updated_at = now()
  WHERE id = p_student_id;
  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_student_hours_visibility(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_student_hours_visibility(uuid, boolean) TO authenticated;

-- A student asking about their own balance gets nothing when it's hidden.
-- Everything else is unchanged from 20261015000002.
CREATE OR REPLACE FUNCTION public.get_student_credit_balance(p_student_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
  v_billing uuid;
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin'
     AND auth.uid() IS DISTINCT FROM p_student_id
     AND NOT public.is_guardian_of(p_student_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.tutor_student_assigned
       WHERE student_id = p_student_id AND tutor_id = auth.uid() AND active = true
     )
  THEN
    RAISE EXCEPTION 'Not authorized to view this student''s credit balance';
  END IF;

  v_billing := public.billing_account_for(p_student_id);

  IF v_billing = p_student_id THEN
    SELECT balance_after INTO v_balance
    FROM class_credits_ledger
    WHERE student_id = p_student_id
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    IF auth.uid() = p_student_id
       AND (SELECT hide_hours_from_student FROM public.profiles WHERE id = p_student_id)
    THEN
      RETURN NULL;
    END IF;
    SELECT credits_remaining INTO v_balance
    FROM student_subscriptions
    WHERE student_id = v_billing AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  RETURN COALESCE(v_balance, 0);
END;
$function$;

-- Family history is the parent's alone (a student who linked a parent keeps
-- an old, closed subscription of their own; this must not surface it).
CREATE OR REPLACE FUNCTION public.get_family_hours_history(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  transaction_type text,
  amount numeric,
  balance_after numeric,
  reason text,
  student_id uuid,
  student_first_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.id, l.created_at, l.transaction_type, l.amount, l.balance_after, l.reason,
         l.student_id, p.first_name
  FROM public.class_credits_ledger l
  JOIN public.student_subscriptions ss ON ss.id = l.subscription_id
  LEFT JOIN public.profiles p ON p.id = l.student_id
  WHERE ss.student_id = auth.uid()
    AND public.get_auth_user_role() = 'parent'
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$function$;

-- The parent's student list gains the visibility switch (return type
-- changes, hence DROP + CREATE; grants restated).
DROP FUNCTION public.get_my_children();
CREATE FUNCTION public.get_my_children()
RETURNS TABLE(
  student_id uuid,
  first_name text,
  last_name text,
  grade text,
  notification_email text,
  timezone text,
  managed boolean,
  linked_at timestamptz,
  hours_visible boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.first_name, p.last_name, s.grade,
         CASE WHEN p.managed THEN p.notification_email ELSE p.email END,
         p.timezone, p.managed, gl.created_at, NOT p.hide_hours_from_student
  FROM public.guardian_links gl
  JOIN public.profiles p ON p.id = gl.student_id
  LEFT JOIN public.students s ON lower(s.email) = lower(p.email)
  WHERE gl.guardian_id = auth.uid()
  ORDER BY gl.created_at, p.first_name;
$function$;

REVOKE ALL ON FUNCTION public.get_my_children() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_children() TO authenticated;
