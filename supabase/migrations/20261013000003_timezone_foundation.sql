-- Time-zone support, step 1 (foundation).
--
-- Class times were stored as bare clock times (date + "16:15") with no zone,
-- implicitly Central, so every viewer saw the same digits regardless of
-- where they were, and calendar exports landed at the wrong hour outside
-- Central. This stores each class as an exact moment (start_at/end_at) plus
-- the zone it was scheduled in, and each person's own time zone.
--
-- Transition safety: the existing date/start_time/end_time columns keep
-- holding the class's *Central* clock time, kept in sync by a trigger in
-- both directions, so every current reader (emails, RPCs, CSV import,
-- not-yet-updated screens) keeps working unchanged while code moves over.
-- All existing classes were entered in the students' (Central) time, so the
-- backfill interprets them as America/Chicago.

-- ── Validation: only real IANA zone names ──────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_timezone_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.timezone IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'Invalid time zone: %', NEW.timezone;
  END IF;
  RETURN NEW;
END;
$function$;

-- ── profiles.timezone ─────────────────────────────────────────────────
-- NULL = not detected yet; readers fall back to America/Chicago.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;
CREATE TRIGGER trg_validate_profile_timezone
  BEFORE INSERT OR UPDATE OF timezone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_timezone_column();

-- ── scheduled_classes ─────────────────────────────────────────────────
ALTER TABLE public.scheduled_classes
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at   timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Chicago';

UPDATE public.scheduled_classes
SET start_at = (date + start_time) AT TIME ZONE 'America/Chicago',
    end_at   = (date + end_time
                + CASE WHEN end_time <= start_time THEN interval '1 day' ELSE interval '0' END
               ) AT TIME ZONE 'America/Chicago'
WHERE start_at IS NULL;

ALTER TABLE public.scheduled_classes
  ALTER COLUMN start_at SET NOT NULL,
  ALTER COLUMN end_at   SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_classes_start_at ON public.scheduled_classes (start_at);

CREATE TRIGGER trg_validate_scheduled_class_timezone
  BEFORE INSERT OR UPDATE OF timezone ON public.scheduled_classes
  FOR EACH ROW EXECUTE FUNCTION public.validate_timezone_column();

-- Keeps the two representations in sync. New code writes start_at/end_at;
-- legacy code writes date/start_time/end_time (as Central clock time).
CREATE OR REPLACE FUNCTION public.sync_scheduled_class_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_use_instants boolean;
BEGIN
  NEW.timezone := COALESCE(NULLIF(NEW.timezone, ''), 'America/Chicago');

  IF TG_OP = 'INSERT' THEN
    v_use_instants := NEW.start_at IS NOT NULL;
  ELSE
    v_use_instants := NEW.start_at IS DISTINCT FROM OLD.start_at
                   OR NEW.end_at   IS DISTINCT FROM OLD.end_at;
  END IF;

  IF v_use_instants THEN
    IF NEW.end_at IS NULL OR NEW.end_at <= NEW.start_at THEN
      RAISE EXCEPTION 'Class end time must be after its start time';
    END IF;
    NEW.date       := (NEW.start_at AT TIME ZONE 'America/Chicago')::date;
    NEW.start_time := (NEW.start_at AT TIME ZONE 'America/Chicago')::time;
    NEW.end_time   := (NEW.end_at   AT TIME ZONE 'America/Chicago')::time;
  ELSIF TG_OP = 'INSERT'
     OR NEW.date       IS DISTINCT FROM OLD.date
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time   IS DISTINCT FROM OLD.end_time THEN
    NEW.start_at := (NEW.date + NEW.start_time) AT TIME ZONE 'America/Chicago';
    NEW.end_at   := (NEW.date + NEW.end_time
                     + CASE WHEN NEW.end_time <= NEW.start_time THEN interval '1 day' ELSE interval '0' END
                    ) AT TIME ZONE 'America/Chicago';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_scheduled_class_times
  BEFORE INSERT OR UPDATE ON public.scheduled_classes
  FOR EACH ROW EXECUTE FUNCTION public.sync_scheduled_class_times();

-- ── class_logs ────────────────────────────────────────────────────────
ALTER TABLE public.class_logs
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Chicago';

-- trg_enforce_class_logs_update_columns rejects writes from a session with
-- no app user (this migration), so it's scoped off for the backfill only.
ALTER TABLE public.class_logs DISABLE TRIGGER trg_enforce_class_logs_update_columns;
UPDATE public.class_logs
SET start_at = ("Date" + "Time (CST)"::time) AT TIME ZONE 'America/Chicago'
WHERE start_at IS NULL AND "Date" IS NOT NULL AND "Time (CST)" ~ '^\d{1,2}:\d{2}';
ALTER TABLE public.class_logs ENABLE TRIGGER trg_enforce_class_logs_update_columns;

CREATE INDEX IF NOT EXISTS idx_class_logs_start_at ON public.class_logs (start_at);

-- Tutors and students may not change the new columns either (admins may).
CREATE OR REPLACE FUNCTION public.enforce_class_logs_update_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text := get_auth_user_role();
BEGIN
  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF v_role = 'tutor' THEN
    IF NEW."Date" IS DISTINCT FROM OLD."Date"
      OR NEW."Day" IS DISTINCT FROM OLD."Day"
      OR NEW."Time (CST)" IS DISTINCT FROM OLD."Time (CST)"
      OR NEW."Time (hrs)" IS DISTINCT FROM OLD."Time (hrs)"
      OR NEW."Student Name" IS DISTINCT FROM OLD."Student Name"
      OR NEW."Tutor Name" IS DISTINCT FROM OLD."Tutor Name"
      OR NEW."Subject" IS DISTINCT FROM OLD."Subject"
      OR NEW."Title" IS DISTINCT FROM OLD."Title"
      OR NEW."Additional Info" IS DISTINCT FROM OLD."Additional Info"
      OR NEW."Class ID" IS DISTINCT FROM OLD."Class ID"
      OR NEW."Class Number" IS DISTINCT FROM OLD."Class Number"
      OR NEW."Class Cost" IS DISTINCT FROM OLD."Class Cost"
      OR NEW."Tutor Cost" IS DISTINCT FROM OLD."Tutor Cost"
      OR NEW.student_payment_date IS DISTINCT FROM OLD.student_payment_date
      OR NEW.tutor_payment_date IS DISTINCT FROM OLD.tutor_payment_date
      OR NEW.tutor_is_paid IS DISTINCT FROM OLD.tutor_is_paid
      OR NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
      OR NEW.tutor_user_id IS DISTINCT FROM OLD.tutor_user_id
      OR NEW.student_rating IS DISTINCT FROM OLD.student_rating
      OR NEW.student_feedback IS DISTINCT FROM OLD.student_feedback
      OR NEW.verified_by_student IS DISTINCT FROM OLD.verified_by_student
      OR NEW.verification_deadline IS DISTINCT FROM OLD.verification_deadline
      OR NEW.start_at IS DISTINCT FROM OLD.start_at
      OR NEW.timezone IS DISTINCT FROM OLD.timezone
    THEN
      RAISE EXCEPTION 'Tutors may only edit the Content and HW fields on a class log';
    END IF;
    RETURN NEW;
  END IF;

  IF v_role = 'student' THEN
    IF NEW."Content" IS DISTINCT FROM OLD."Content"
      OR NEW."HW" IS DISTINCT FROM OLD."HW"
      OR NEW."Date" IS DISTINCT FROM OLD."Date"
      OR NEW."Day" IS DISTINCT FROM OLD."Day"
      OR NEW."Time (CST)" IS DISTINCT FROM OLD."Time (CST)"
      OR NEW."Time (hrs)" IS DISTINCT FROM OLD."Time (hrs)"
      OR NEW."Student Name" IS DISTINCT FROM OLD."Student Name"
      OR NEW."Tutor Name" IS DISTINCT FROM OLD."Tutor Name"
      OR NEW."Title" IS DISTINCT FROM OLD."Title"
      OR NEW."Class Cost" IS DISTINCT FROM OLD."Class Cost"
      OR NEW."Tutor Cost" IS DISTINCT FROM OLD."Tutor Cost"
      OR NEW.student_payment_date IS DISTINCT FROM OLD.student_payment_date
      OR NEW.tutor_payment_date IS DISTINCT FROM OLD.tutor_payment_date
      OR NEW.tutor_is_paid IS DISTINCT FROM OLD.tutor_is_paid
      OR NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
      OR NEW.tutor_user_id IS DISTINCT FROM OLD.tutor_user_id
      OR NEW.verified_by_student IS DISTINCT FROM OLD.verified_by_student
      OR NEW.verification_deadline IS DISTINCT FROM OLD.verification_deadline
      OR NEW.start_at IS DISTINCT FROM OLD.start_at
      OR NEW.timezone IS DISTINCT FROM OLD.timezone
    THEN
      RAISE EXCEPTION 'Students may only edit their rating, feedback, and dispute report on a class log';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update class logs directly';
END;
$function$;

-- Logging a class copies start_at/timezone onto the log, derives the
-- Central Date/Day/Time itself, and flags its own delete of the scheduled
-- row as a completion (see log_class_cancellation below).
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
      SET manual_priced_classes_remaining = manual_priced_classes_remaining - 1
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

-- ── Completions were being recorded as cancellations ──────────────────
-- complete_class_atomic deletes the scheduled row after logging it, and
-- this BEFORE DELETE trigger recorded every deletion as a cancellation —
-- 34 of the 45 rows in class_cancellations are actually completed classes
-- (shown under "Recent Cancellations" on the admin Class Logs page). New
-- completions are skipped via the flag complete_class_atomic now sets; the
-- existing incorrect rows are left for a separate, explicitly approved
-- cleanup.
CREATE OR REPLACE FUNCTION public.log_class_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('learn2lead.completing_class', true) = 'on' THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.class_cancellations (
    scheduled_class_id,
    title,
    subject,
    student_id,
    tutor_id,
    class_date,
    class_start,
    zoom_link,
    notes,
    cancelled_by
  ) VALUES (
    OLD.id,
    OLD.title,
    OLD.subject,
    OLD.student_id,
    OLD.tutor_id,
    OLD.date,
    OLD.start_time,
    OLD.zoom_link,
    OLD.notes,
    auth.uid()
  );
  RETURN OLD;
END;
$function$;
