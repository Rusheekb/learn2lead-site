-- Standardize on "hours" (part of the credits -> hours wording change).
--
-- 1. Plan names: "12 Credit Pack" -> "12-Hour Pack" (test plans keep their
--    "(Test)" suffix). Shown on students' settings and in auto-renewal emails.
--    Safe to rename: checkout matches plans by Stripe price id, and
--    auto-renewal recovery now looks plans up by id (with fallbacks for
--    payments created under the old names) — see stripe-webhooks.
--    Historical hours-history entries are not rewritten; the app translates
--    the old wording for display.
--
-- 2. One-off manual rates (Adjust Hours with a rate) were spent one CLASS at
--    a time while being granted in HOURS, so 6 hours at a special rate priced
--    6 classes — 9 hours for a weekly 1.5-hour student. complete_class_atomic
--    now spends the allowance by the hours each class uses. (No student had an
--    active allowance when this shipped.) The column keeps its old name.

UPDATE public.subscription_plans
SET name = regexp_replace(name, '^(\d+) Credit Pack', '\1-Hour Pack')
WHERE name ~ '^\d+ Credit Pack';

CREATE OR REPLACE FUNCTION public.complete_class_atomic(p_class_id uuid, p_class_number text, p_tutor_name text, p_student_name text, p_date date, p_day text, p_time_cst text, p_time_hrs text, p_subject text, p_content text, p_hw text, p_additional_info text, p_credits_charged numeric DEFAULT NULL::numeric)
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
  v_subscription_id uuid;
  v_manual_rate numeric;
  v_manual_remaining numeric(6,2);
  v_duration numeric;
  class_exists boolean;
  v_start_at timestamptz;
  v_timezone text;
  v_date date;
  v_day text;
  v_time_cst text;
  v_caller_id uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required',
      'code', 'NOT_AUTHENTICATED'
    );
  END IF;

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

  -- Get actual names, user IDs, and tutor rate via UUID-based joins
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
    t.hourly_rate,
    sc.start_at,
    sc.timezone
  INTO v_tutor_user_id, v_student_user_id, actual_tutor_name, actual_student_name, v_tutor_cost, v_start_at, v_timezone
  FROM public.scheduled_classes sc
  LEFT JOIN public.profiles tp ON sc.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON sc.student_id = sp.id
  LEFT JOIN public.tutors t ON tp.email = t.email
  WHERE sc.id = p_class_id;

  -- Resolve the student's active subscription once (read-only — the actual
  -- manual-rate decrement happens later, only once we know the class will
  -- really be logged, so a rejected/duplicate request never burns a
  -- manually-priced class): a still-active one-off manual rate takes
  -- priority over the Stripe-plan-derived price; NULL when there's no active
  -- subscription or no plan and no manual rate, same as before.
  SELECT ss.id, ss.manual_price_per_hour, ss.manual_priced_classes_remaining, plan.price_per_hour
  INTO v_subscription_id, v_manual_rate, v_manual_remaining, v_class_cost
  FROM public.student_subscriptions ss
  LEFT JOIN public.subscription_plans plan ON plan.id = ss.plan_id
  WHERE ss.student_id = v_student_user_id
    AND ss.status IN ('active', 'trialing')
  ORDER BY ss.created_at DESC
  LIMIT 1;

  IF v_manual_remaining IS NOT NULL AND v_manual_remaining > 0 THEN
    v_class_cost := v_manual_rate;
  END IF;

  -- price_per_hour / manual_price_per_hour / hourly_rate are all genuinely
  -- hourly rates — scale both cost figures by the class's actual duration.
  -- NULL * anything = NULL, so a student with no plan and no manual rate
  -- still correctly gets a NULL Class Cost rather than a fabricated number.
  v_duration := COALESCE(p_credits_charged, NULLIF(p_time_hrs, '')::numeric, 1);
  v_class_cost := v_class_cost * v_duration;
  v_tutor_cost := v_tutor_cost * v_duration;

  -- Only the class's own assigned tutor or an admin may complete it —
  -- without this, any authenticated account (or, before this migration,
  -- even an unauthenticated caller) could complete an arbitrary class by
  -- guessing/obtaining its UUID, consuming credits and deleting the
  -- schedule row with no ownership check at all.
  IF v_caller_id != v_tutor_user_id AND get_auth_user_role() != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to complete this class',
      'code', 'PERMISSION_DENIED'
    );
  END IF;

  actual_tutor_name  := COALESCE(actual_tutor_name, p_tutor_name, 'Unknown Tutor');
  actual_student_name := COALESCE(actual_student_name, p_student_name, 'Unknown Student');

  -- Date / Day / "Time (CST)" always record the class's Central clock time,
  -- derived from its exact start (start_at) instead of trusting the client,
  -- whose screen may now show the class in a different time zone.
  v_date     := COALESCE((v_start_at AT TIME ZONE 'America/Chicago')::date, p_date);
  v_day      := COALESCE(to_char(v_start_at AT TIME ZONE 'America/Chicago', 'FMDay'), p_day);
  v_time_cst := COALESCE(to_char(v_start_at AT TIME ZONE 'America/Chicago', 'HH24:MI'), p_time_cst);

  -- Secondary duplicate guard: same tutor/student/date/time/subject
  SELECT COUNT(*) INTO existing_log_count
  FROM public.class_logs
  WHERE "Tutor Name"  = actual_tutor_name
    AND "Student Name" = actual_student_name
    AND "Date"         = v_date
    AND "Time (CST)"   = v_time_cst
    AND "Subject"      = p_subject;

  IF existing_log_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A class log already exists for this session',
      'code', 'DUPLICATE_SESSION'
    );
  END IF;

  BEGIN
    IF v_manual_remaining IS NOT NULL AND v_manual_remaining > 0 THEN
      UPDATE public.student_subscriptions
      -- Spend the one-off allowance by hours used, not by class: it's
      -- granted as hours (Adjust Hours), so a 1.5-hour class uses 1.5.
      SET manual_priced_classes_remaining =
        GREATEST(manual_priced_classes_remaining - v_duration, 0)
      WHERE id = v_subscription_id;
    END IF;

    INSERT INTO public.class_logs (
      "Class Number", "Tutor Name", "Student Name",
      "Date", "Day", "Time (CST)", "Time (hrs)",
      "Subject", "Content", "HW", "Class ID",
      "Additional Info", "Class Cost", "Tutor Cost",
      tutor_user_id, student_user_id,
      student_payment_date, start_at, timezone
    ) VALUES (
      p_class_number, actual_tutor_name, actual_student_name,
      v_date, v_day, v_time_cst, p_time_hrs,
      p_subject, p_content, p_hw, p_class_id::text,
      p_additional_info, v_class_cost, v_tutor_cost,
      v_tutor_user_id, v_student_user_id,
      CURRENT_DATE, v_start_at, COALESCE(v_timezone, 'America/Chicago')
    );

    -- Tell log_class_cancellation this delete is a completion, not a
    -- cancellation (transaction-local, cleared right after).
    PERFORM set_config('learn2lead.completing_class', 'on', true);
    DELETE FROM public.scheduled_classes WHERE id = p_class_id;
    PERFORM set_config('learn2lead.completing_class', 'off', true);

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
