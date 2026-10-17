-- Cleanup pass: drop DB columns/functions confirmed to have no real reader
-- anywhere in the app (verified against live pg_proc source + full-codebase
-- grep, not just migration history — several of these were superseded by
-- newer functions of the same purpose and never actually deleted).
--
-- students.payment_status: written on signup as a hardcoded 'paid'/'pending'
-- literal (never a real payment computation), read back into
-- Student.paymentStatus, but that field was never rendered by any
-- component. Three live functions still referenced it — updated below to
-- drop it from their own signatures before the column goes away.
--
-- students.class_rate: superseded by the prior migration
-- (20260825000001_class_cost_from_subscription_plan.sql), which moved Class
-- Cost computation in complete_class_atomic onto
-- subscription_plans.price_per_class. get_students_credit_summary also
-- selected class_rate but the frontend never rendered it
-- (StudentPaymentSummary.tsx declared the field on its row type, never used
-- it) — dropped from its signature below.
--
-- get_tutor_students (the non-email variant): not called anywhere in the
-- frontend — get_tutor_students_by_email is the one actually used
-- (fetchTutorStudentsByEmail). Dropped outright.
--
-- get_tutor_ratings / get_admin_student_overview / get_student_unpaid_summary:
-- none called from any frontend code — leftover from admin UI (Tutor
-- Directory ratings column, admin/students/StudentDetailDrawer.tsx) removed
-- earlier this session. Dropped outright.

-- auto_sync_user_role: return type (trigger) is unchanged, so a plain
-- CREATE OR REPLACE preserves its trigger attachment and grants.
CREATE OR REPLACE FUNCTION public.auto_sync_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'student' THEN
    IF NOT EXISTS (SELECT 1 FROM students WHERE email = NEW.email) THEN
      INSERT INTO students (
        name,
        email,
        subjects,
        grade,
        enrollment_date,
        active
      ) VALUES (
        CASE
          WHEN TRIM(COALESCE(NEW.first_name, '')) != '' OR TRIM(COALESCE(NEW.last_name, '')) != '' THEN
            TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')))
          ELSE
            NEW.email
        END,
        NEW.email,
        '{}',
        'Not specified',
        CURRENT_DATE,
        true
      );
    END IF;

    DELETE FROM tutors WHERE email = NEW.email;

  ELSIF NEW.role = 'tutor' THEN
    IF NOT EXISTS (SELECT 1 FROM tutors WHERE email = NEW.email) THEN
      INSERT INTO tutors (
        name,
        email,
        subjects,
        hourly_rate,
        active
      ) VALUES (
        CASE
          WHEN TRIM(COALESCE(NEW.first_name, '')) != '' OR TRIM(COALESCE(NEW.last_name, '')) != '' THEN
            TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')))
          ELSE
            NEW.email
        END,
        NEW.email,
        '{}',
        25,
        true
      );
    END IF;

    DELETE FROM students WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$function$;

-- Return-type changes (a column is being removed from RETURNS TABLE) aren't
-- allowed via CREATE OR REPLACE, so these are dropped and recreated. None of
-- these three had an explicit REVOKE ever applied (proacl showed default
-- PUBLIC execute), so recreating without an explicit GRANT reproduces the
-- same access.

DROP FUNCTION public.get_tutor_students(uuid);

DROP FUNCTION public.get_tutor_students_by_email(uuid);

CREATE FUNCTION public.get_tutor_students_by_email(requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(tutor_id uuid, student_id uuid, student_name text, student_email text, tutor_name text, subjects text[], grade text, active boolean, assigned_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = requesting_user_id
    AND role IN ('admin', 'tutor', 'student')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
      tsa.tutor_id,
      tsa.student_id,
      CASE
        WHEN TRIM(COALESCE(sp.first_name, '')) != '' OR TRIM(COALESCE(sp.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, '')))
        ELSE
          sp.email
      END as student_name,
      sp.email as student_email,
      CASE
        WHEN TRIM(COALESCE(tp.first_name, '')) != '' OR TRIM(COALESCE(tp.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(tp.first_name, ''), ' ', COALESCE(tp.last_name, '')))
        ELSE
          tp.email
      END as tutor_name,
      COALESCE(s.subjects, '{}') as subjects,
      COALESCE(s.grade, 'Not specified') as grade,
      tsa.active,
      tsa.assigned_at
  FROM public.tutor_student_assigned tsa
  LEFT JOIN public.profiles tp ON tsa.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON tsa.student_id = sp.id
  LEFT JOIN public.students s ON sp.email = s.email
  WHERE
    CASE
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'admin' THEN true
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'tutor' THEN tsa.tutor_id = requesting_user_id
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'student' THEN tsa.student_id = requesting_user_id
      ELSE false
    END
    AND tsa.active = true;
END;
$function$;

DROP FUNCTION public.get_students_credit_summary();

CREATE FUNCTION public.get_students_credit_summary()
 RETURNS TABLE(student_name text, profile_id uuid, credits numeric, last_class_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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

DROP FUNCTION IF EXISTS public.get_tutor_ratings();
DROP FUNCTION IF EXISTS public.get_admin_student_overview();
DROP FUNCTION IF EXISTS public.get_student_unpaid_summary();

ALTER TABLE public.students DROP COLUMN IF EXISTS payment_status;
ALTER TABLE public.students DROP COLUMN IF EXISTS class_rate;
