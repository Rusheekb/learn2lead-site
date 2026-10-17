-- ============================================================
-- 1. Fix complete_class_atomic: check class_logs FIRST so a
--    successful-but-unacknowledged completion returns ALREADY_COMPLETED
--    instead of CLASS_NOT_FOUND on retry, preventing false credit restores.
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_class_atomic(
  p_class_id uuid,
  p_class_number text,
  p_tutor_name text,
  p_student_name text,
  p_date date,
  p_day text,
  p_time_cst text,
  p_time_hrs text,
  p_subject text,
  p_content text,
  p_hw text,
  p_additional_info text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_log_count integer;
  actual_tutor_name text;
  actual_student_name text;
  v_student_user_id uuid;
  v_tutor_user_id uuid;
  v_class_cost numeric;
  v_tutor_cost numeric;
  v_prepaid_count integer := 0;
  class_exists boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_class_id::text));

  -- Check class_logs FIRST (by Class ID) so a completed-but-unacknowledged
  -- class correctly returns ALREADY_COMPLETED rather than CLASS_NOT_FOUND.
  SELECT COUNT(*) INTO existing_log_count
  FROM public.class_logs
  WHERE "Class ID" = p_class_id::text;

  IF existing_log_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Class already completed',
      'code', 'ALREADY_COMPLETED'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.scheduled_classes WHERE id = p_class_id
  ) INTO class_exists;

  IF NOT class_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Class no longer exists or has already been completed',
      'code', 'CLASS_NOT_FOUND'
    );
  END IF;

  -- Get actual names, user IDs, and rates via UUID-based joins
  SELECT
    sc.tutor_id,
    sc.student_id,
    CASE
      WHEN TRIM(COALESCE(tp.first_name, '')) != '' OR TRIM(COALESCE(tp.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(tp.first_name, ''), ' ', COALESCE(tp.last_name, '')))
      ELSE COALESCE(tp.email, 'Unknown Tutor')
    END,
    CASE
      WHEN TRIM(COALESCE(sp.first_name, '')) != '' OR TRIM(COALESCE(sp.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, '')))
      ELSE COALESCE(sp.email, 'Unknown Student')
    END,
    s.class_rate,
    t.hourly_rate
  INTO v_tutor_user_id, v_student_user_id, actual_tutor_name, actual_student_name, v_class_cost, v_tutor_cost
  FROM public.scheduled_classes sc
  LEFT JOIN public.profiles tp ON sc.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON sc.student_id = sp.id
  LEFT JOIN public.students s ON sp.email = s.email
  LEFT JOIN public.tutors t ON tp.email = t.email
  WHERE sc.id = p_class_id;

  actual_tutor_name  := COALESCE(actual_tutor_name, p_tutor_name, 'Unknown Tutor');
  actual_student_name := COALESCE(actual_student_name, p_student_name, 'Unknown Student');

  -- Secondary duplicate guard: same tutor/student/date/time/subject
  SELECT COUNT(*) INTO existing_log_count
  FROM public.class_logs
  WHERE "Tutor Name"  = actual_tutor_name
    AND "Student Name" = actual_student_name
    AND "Date"         = p_date
    AND "Time (CST)"   = p_time_cst
    AND "Subject"      = p_subject;

  IF existing_log_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A class log already exists for this session',
      'code', 'DUPLICATE_SESSION'
    );
  END IF;

  -- Check if the student has prepaid class credits
  IF v_student_user_id IS NOT NULL THEN
    SELECT COALESCE(s.prepaid_class_count, 0)
    INTO v_prepaid_count
    FROM public.students s
    JOIN public.profiles sp ON sp.email = s.email
    WHERE sp.id = v_student_user_id;
  END IF;

  BEGIN
    INSERT INTO public.class_logs (
      "Class Number", "Tutor Name", "Student Name",
      "Date", "Day", "Time (CST)", "Time (hrs)",
      "Subject", "Content", "HW", "Class ID",
      "Additional Info", "Class Cost", "Tutor Cost",
      tutor_user_id, student_user_id,
      student_payment_date
    ) VALUES (
      p_class_number, actual_tutor_name, actual_student_name,
      p_date, p_day, p_time_cst, p_time_hrs,
      p_subject, p_content, p_hw, p_class_id::text,
      p_additional_info, v_class_cost, v_tutor_cost,
      v_tutor_user_id, v_student_user_id,
      CASE WHEN v_prepaid_count > 0 THEN CURRENT_DATE ELSE NULL END
    );

    -- Consume one prepaid credit
    IF v_prepaid_count > 0 AND v_student_user_id IS NOT NULL THEN
      UPDATE public.students s
      SET prepaid_class_count = GREATEST(prepaid_class_count - 1, 0)
      FROM public.profiles sp
      WHERE sp.email = s.email
        AND sp.id = v_student_user_id;
    END IF;

    DELETE FROM public.scheduled_classes WHERE id = p_class_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Class completed successfully',
      'tutor_name', actual_tutor_name,
      'student_name', actual_student_name,
      'class_cost', v_class_cost,
      'tutor_cost', v_tutor_cost
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Class session already logged', 'code', 'DUPLICATE_SESSION');
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', 'DATABASE_ERROR');
  END;
END;
$function$;


-- ============================================================
-- 2. Best-effort UUID backfill for historic class_logs rows
--    imported via CSV (they have names but no user IDs).
-- ============================================================

-- Backfill tutor_user_id
UPDATE public.class_logs cl
SET tutor_user_id = p.id
FROM public.profiles p
WHERE cl.tutor_user_id IS NULL
  AND p.role = 'tutor'
  AND TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) = cl."Tutor Name";

-- Backfill student_user_id
UPDATE public.class_logs cl
SET student_user_id = p.id
FROM public.profiles p
WHERE cl.student_user_id IS NULL
  AND p.role = 'student'
  AND (
    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) = cl."Student Name"
    OR p.email = cl."Student Name"
  );


-- ============================================================
-- 3. Add tutor_user_id to tutor_payroll_runs so tutors can
--    read their own payroll history.
-- ============================================================
ALTER TABLE public.tutor_payroll_runs
  ADD COLUMN IF NOT EXISTS tutor_user_id UUID REFERENCES auth.users(id);

-- Drop the admin-only policy and recreate to also allow tutors to read their own rows
DROP POLICY IF EXISTS "Admins can manage payroll runs" ON public.tutor_payroll_runs;

CREATE POLICY "Admins can manage payroll runs"
ON public.tutor_payroll_runs FOR ALL TO public
USING (get_auth_user_role() = 'admin');

CREATE POLICY "Tutors can view their own payroll runs"
ON public.tutor_payroll_runs FOR SELECT TO public
USING (
  get_auth_user_role() = 'tutor'
  AND tutor_user_id = auth.uid()
);


-- ============================================================
-- 4. Update get_tutor_unpaid_summary to also return tutor's
--    user_id so the admin UI can store it with payroll runs.
-- ============================================================
DROP FUNCTION IF EXISTS public.get_tutor_unpaid_summary();
CREATE OR REPLACE FUNCTION public.get_tutor_unpaid_summary()
RETURNS TABLE (
  tutor_name        TEXT,
  tutor_user_id     UUID,
  unpaid_count      BIGINT,
  total_owed        NUMERIC,
  class_ids         UUID[],
  last_payment_date DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  GROUP BY cl."Tutor Name", cl.tutor_user_id
  HAVING COUNT(*) > 0
  ORDER BY total_owed DESC NULLS LAST;
$$;


-- ============================================================
-- 5. RPC for tutors to view their own payroll run history
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_payroll_history()
RETURNS TABLE (
  id           UUID,
  paid_at      DATE,
  amount_paid  NUMERIC,
  class_count  INTEGER,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    pr.id,
    pr.paid_at,
    pr.amount_paid,
    pr.class_count,
    pr.created_at
  FROM public.tutor_payroll_runs pr
  WHERE pr.tutor_user_id = auth.uid()
  ORDER BY pr.created_at DESC
  LIMIT 50;
$$;
