-- Class Cost and Tutor Cost were always computed as flat rates
-- (subscription_plans.price_per_class, tutors.hourly_rate) with no
-- multiplication by the class's actual duration, despite both being
-- genuinely hourly rates (confirmed via CREDIT_TIERS in
-- src/config/stripe.ts: the $25/$30/$35 tiers are literally `perHour`).
-- A 1.5-hour class was billed/paid identically to a 1-hour one. Caught
-- live: Geetika Bora's two 1.5h classes (Aug 25 + 27) were logged at the
-- same flat $25/$15 as her 1h classes, undercounting both revenue and
-- what her tutor is actually owed.
--
-- Credit *deduction* already handled duration correctly (deduct-class-credit
-- rounds to the nearest half hour via roundToHalfHour and debits that many
-- credits) — this fix reuses that exact same already-rounded number for
-- cost math, passed through from the frontend as p_credits_charged, rather
-- than re-deriving duration a second time here. That avoids two independent
-- rounding implementations (one in the JS edge function, one in SQL)
-- quietly drifting apart for odd durations. Falls back to p_time_hrs (the
-- raw stored duration) if a caller doesn't pass it, so this stays safe
-- during the brief window between this migration landing and the frontend
-- redeploying.
CREATE OR REPLACE FUNCTION public.complete_class_atomic(p_class_id uuid, p_class_number text, p_tutor_name text, p_student_name text, p_date date, p_day text, p_time_cst text, p_time_hrs text, p_subject text, p_content text, p_hw text, p_additional_info text, p_credits_charged numeric DEFAULT NULL)
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
    t.hourly_rate
  INTO v_tutor_user_id, v_student_user_id, actual_tutor_name, actual_student_name, v_tutor_cost
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
  SELECT ss.id, ss.manual_price_per_class, ss.manual_priced_classes_remaining, plan.price_per_class
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

  -- price_per_class / manual_price_per_class / hourly_rate are all
  -- genuinely hourly rates despite the "per class" naming — scale both
  -- cost figures by the class's actual duration. NULL * anything = NULL,
  -- so a student with no plan and no manual rate still correctly gets a
  -- NULL Class Cost rather than a fabricated number.
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

  BEGIN
    IF v_manual_remaining IS NOT NULL AND v_manual_remaining > 0 THEN
      UPDATE public.student_subscriptions
      SET manual_priced_classes_remaining = manual_priced_classes_remaining - 1
      WHERE id = v_subscription_id;
    END IF;

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
      CURRENT_DATE
    );

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

-- Adding a parameter isn't a like-for-like CREATE OR REPLACE — it's a
-- different signature (same pitfall as apply_credit_ledger_entry's numeric
-- migration), so the old 12-arg overload lingers as a separate, ambiguous
-- function unless dropped explicitly. It would also leave two overloads
-- resolvable from the REST RPC endpoint simultaneously.
DROP FUNCTION IF EXISTS public.complete_class_atomic(uuid, text, text, text, date, text, text, text, text, text, text, text);

-- A fresh CREATE FUNCTION (this is a new signature, not a true replace)
-- defaults to PUBLIC-executable, silently losing the anon-blocked,
-- authenticated-only grant the old function had. Restore it explicitly.
REVOKE ALL ON FUNCTION public.complete_class_atomic(uuid, text, text, text, date, text, text, text, text, text, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_class_atomic(uuid, text, text, text, date, text, text, text, text, text, text, text, numeric) TO authenticated, service_role;

-- One-time correction for the 4 real classes logged before this fix
-- shipped (Geetika Bora + Ariana Rayi, Aug 25 & 27). Scales each row's
-- existing (flat, 1h-equivalent) Class Cost/Tutor Cost by its own actual
-- "Time (hrs)" rather than hardcoding new numbers — a no-op for the two
-- 1-hour rows, and corrects the two 1.5-hour rows from $25/$15 to
-- $37.50/$22.50. Confirmed live beforehand that tutor_is_paid is false and
-- tutor_payment_date is null on all 4, so this is a clean update, not a
-- clawback of money already paid out.
--
-- trg_enforce_class_logs_update_columns blocks direct UPDATEs to class_logs
-- from any caller without an admin auth.uid() context — this migration runs
-- outside a real user session, so it's disabled for just this one
-- statement rather than weakening the trigger itself.
ALTER TABLE public.class_logs DISABLE TRIGGER trg_enforce_class_logs_update_columns;

UPDATE public.class_logs
SET "Class Cost" = "Class Cost" * "Time (hrs)"::numeric,
    "Tutor Cost" = "Tutor Cost" * "Time (hrs)"::numeric
WHERE id IN (
  '470ecbc8-004e-4d75-a880-003d330d1eba', -- Geetika Bora, Aug 27, 1.5h
  '7c5510d0-d642-452b-93b2-01e84c5be373', -- Ariana Rayi,  Aug 27, 1h (no-op)
  '240ecb65-d234-45e3-825e-0110374ad82a', -- Geetika Bora, Aug 25, 1.5h
  'c26cb84d-0923-4f7f-b4ca-ff5138f470b4'  -- Ariana Rayi,  Aug 25, 1h (no-op)
);

ALTER TABLE public.class_logs ENABLE TRIGGER trg_enforce_class_logs_update_columns;
