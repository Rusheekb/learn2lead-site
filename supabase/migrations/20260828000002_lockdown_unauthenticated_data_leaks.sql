-- Supabase's security advisor flagged 7 SECURITY DEFINER functions as
-- executable by `anon`/`authenticated` with zero internal authorization
-- check. SECURITY DEFINER bypasses table RLS, and Postgres grants EXECUTE
-- to PUBLIC by default unless explicitly revoked — so despite the frontend
-- only calling these from admin/tutor-gated screens, anyone who knows the
-- function name could call them directly via the REST RPC endpoint, no
-- login required, and get real student names/emails/credit balances,
-- tutor payroll dollar amounts, or (worst case) tomorrow's class schedule
-- including Zoom links.
--
-- Fix pattern matches what promote_student_to_tutor/demote_tutor_to_student
-- already do elsewhere in this schema: check the caller's role/identity
-- inside the function body. `IS DISTINCT FROM` is used instead of `!=` so an
-- anonymous caller (get_auth_user_role() returns NULL, no profile row)
-- is correctly denied rather than falling through — `NULL != 'admin'`
-- evaluates to NULL, which `IF` treats as false (not denied).

-- Admin-only reporting functions: deny by returning an empty result set
-- rather than raising, since these back dashboard widgets that already
-- handle "no rows" gracefully.
CREATE OR REPLACE FUNCTION public.get_at_risk_students()
 RETURNS TABLE(student_name text, profile_id uuid, email text, credits_remaining numeric, last_class_date date, days_since_class integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''),
      p.email
    ) AS student_name,
    p.id  AS profile_id,
    p.email,
    ss.credits_remaining::NUMERIC,
    MAX(cl."Date")::DATE AS last_class_date,
    COALESCE(
      (CURRENT_DATE - MAX(cl."Date")::DATE)::INTEGER,
      999
    )                    AS days_since_class
  FROM student_subscriptions ss
  JOIN profiles p ON p.id = ss.student_id
  LEFT JOIN class_logs cl ON cl.student_user_id = p.id
  WHERE ss.status IN ('active', 'trialing')
  GROUP BY p.id, p.first_name, p.last_name, p.email, ss.credits_remaining
  HAVING
    MAX(cl."Date")::DATE < CURRENT_DATE - INTERVAL '30 days'
    OR MAX(cl."Date") IS NULL
  ORDER BY last_class_date ASC NULLS FIRST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_students_credit_summary()
 RETURNS TABLE(student_name text, profile_id uuid, credits numeric, last_class_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(
      s.name,
      NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), '')
    )                                  AS student_name,
    p.id                               AS profile_id,
    ss.credits_remaining::NUMERIC      AS credits,
    (
      SELECT cl."Date"
      FROM   class_logs cl
      WHERE  cl.student_user_id = p.id
      ORDER  BY cl."Date" DESC
      LIMIT  1
    )                                  AS last_class_date
  FROM student_subscriptions ss
  JOIN  profiles p ON p.id = ss.student_id AND p.role = 'student'
  LEFT JOIN students s ON s.email = p.email
  WHERE ss.status IN ('active', 'trialing')
    AND ss.credits_remaining <= 2
  ORDER BY ss.credits_remaining ASC, p.last_name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_zero_credit_upcoming_students()
 RETURNS TABLE(student_name text, profile_id uuid, email text, credits_remaining numeric, next_class_date date, next_class_title text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''),
      p.email
    ) AS student_name,
    p.id    AS profile_id,
    p.email,
    ss.credits_remaining::NUMERIC,
    sc.date::DATE          AS next_class_date,
    sc.title               AS next_class_title
  FROM student_subscriptions ss
  JOIN profiles p ON p.id = ss.student_id
  JOIN LATERAL (
    SELECT date, title
    FROM   scheduled_classes
    WHERE  student_id = ss.student_id
      AND  date >= CURRENT_DATE
    ORDER  BY date ASC, start_time ASC
    LIMIT  1
  ) sc ON TRUE
  WHERE ss.status IN ('active', 'trialing')
    AND ss.credits_remaining <= 0
  ORDER BY sc.date ASC;
END;
$function$;

-- LANGUAGE sql — no IF/branching available, so the admin check is folded
-- into the WHERE clause instead. A non-admin (or NULL, for anon) caller
-- makes this predicate false for every row, correctly returning no rows.
CREATE OR REPLACE FUNCTION public.get_tutor_unpaid_summary()
 RETURNS TABLE(tutor_name text, tutor_user_id uuid, unpaid_count bigint, total_owed numeric, class_ids uuid[], last_payment_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    cl."Tutor Name"                                   AS tutor_name,
    cl.tutor_user_id                                  AS tutor_user_id,
    COUNT(*)::BIGINT                                  AS unpaid_count,
    COALESCE(SUM(cl."Tutor Cost"::NUMERIC), 0)        AS total_owed,
    ARRAY_AGG(cl.id ORDER BY cl."Date")               AS class_ids,
    (
      SELECT MAX(cl2.tutor_payment_date)
      FROM   public.class_logs cl2
      WHERE  cl2."Tutor Name" = cl."Tutor Name"
        AND  cl2.tutor_payment_date IS NOT NULL
    )                                                 AS last_payment_date
  FROM public.class_logs cl
  WHERE cl.tutor_payment_date IS NULL
    AND cl."Tutor Name" IS NOT NULL
    AND public.get_auth_user_role() = 'admin'
  GROUP BY cl."Tutor Name", cl.tutor_user_id
  HAVING COUNT(*) > 0
  ORDER BY total_owed DESC NULLS LAST;
$function$;

-- Takes a target tutor_uuid — must additionally check the caller either
-- owns that tutor identity or is an admin, not just that tutor_uuid refers
-- to *some* real tutor. Falls into the existing catch-all EXCEPTION
-- handler below, which already converts any raised error into an empty
-- result set (same graceful-degradation behavior as an invalid tutor_uuid).
CREATE OR REPLACE FUNCTION public.get_tutor_student_relationships(tutor_uuid uuid)
 RETURNS TABLE(relationship_id uuid, student_id uuid, student_name text, tutor_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Add error handling and validation
  IF tutor_uuid IS NULL THEN
    RAISE EXCEPTION 'Tutor UUID cannot be null';
  END IF;

  IF get_auth_user_role() IS DISTINCT FROM 'admin' AND auth.uid() IS DISTINCT FROM tutor_uuid THEN
    RAISE EXCEPTION 'Not authorized to view this tutor''s relationships';
  END IF;

  -- Verify tutor exists and has proper role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = tutor_uuid AND role = 'tutor'
  ) THEN
    RAISE EXCEPTION 'Invalid tutor or insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    tsa.id as relationship_id,
    tsa.student_id,
    CASE
      WHEN TRIM(COALESCE(p.first_name, '')) != '' OR TRIM(COALESCE(p.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
      ELSE
        COALESCE(p.email, 'Student')
    END as student_name,
    tsa.tutor_id
  FROM public.tutor_student_assigned tsa
  LEFT JOIN public.profiles p ON tsa.student_id = p.id
  WHERE tsa.tutor_id = tutor_uuid
  AND tsa.active = true
  ORDER BY student_name;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result
    RAISE WARNING 'Error in get_tutor_student_relationships: %', SQLERRM;
    RETURN;
END;
$function$;

-- Admin, the student themselves, or a tutor actively assigned to that
-- student (the real caller in AddClassDialog, checking a balance before
-- scheduling) may see a balance; anyone else gets a raised error rather
-- than a real number, since this returns a bare scalar with no "empty
-- result set" option.
CREATE OR REPLACE FUNCTION public.get_student_credit_balance(p_student_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin'
     AND auth.uid() IS DISTINCT FROM p_student_id
     AND NOT EXISTS (
       SELECT 1 FROM public.tutor_student_assigned
       WHERE student_id = p_student_id AND tutor_id = auth.uid() AND active = true
     )
  THEN
    RAISE EXCEPTION 'Not authorized to view this student''s credit balance';
  END IF;

  SELECT balance_after INTO v_balance
  FROM class_credits_ledger
  WHERE student_id = p_student_id
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN COALESCE(v_balance, 0);
END;
$function$;

-- Only ever called by the class-reminder edge function via the service
-- role key, never directly from the frontend — but returned tomorrow's
-- student/tutor names, emails, AND Zoom links to anyone who called it
-- directly, since it had no auth check and default PUBLIC execute grants.
-- Unlike the functions above, this one shouldn't gain an internal role
-- check (service-role calls don't carry an app-level 'admin' role via
-- get_auth_user_role() at all) — instead, lock down who can call it at
-- all, matching the existing apply_credit_ledger_entry/reverse_class_debit
-- precedent.
REVOKE ALL ON FUNCTION public.get_tomorrow_scheduled_classes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tomorrow_scheduled_classes() TO service_role;
