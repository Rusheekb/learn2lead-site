-- Security audit finding: several SECURITY DEFINER functions were executable
-- by the anon/authenticated roles via PostgREST RPC with no internal
-- authorization check. Two (apply_credit_ledger_entry, reverse_class_debit)
-- were already fixed directly in the database during the audit session and
-- are re-applied here for migration-history completeness. This migration
-- adds the remaining fixes:
--   - complete_class_atomic: real callers are tutors completing their own
--     classes via the browser's authenticated session (see
--     src/services/classCompletion.ts), so this can't be restricted to
--     service_role. Instead it now requires the caller to be the class's
--     assigned tutor or an admin, and anon is revoked outright.
--   - check_upcoming_classes, generate_class_notifications, sync_user_roles,
--     log_critical_security_event, log_enhanced_security_event: no frontend
--     or edge-function caller uses the authenticated/anon role for these
--     (check_upcoming_classes is only invoked by send-class-reminders under
--     service_role), so they're restricted to service_role entirely.

REVOKE ALL ON FUNCTION public.apply_credit_ledger_entry(uuid, uuid, text, integer, text, text, text, numeric, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_ledger_entry(uuid, uuid, text, integer, text, text, text, numeric, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.reverse_class_debit(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_class_debit(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_class_atomic(p_class_id uuid, p_class_number text, p_tutor_name text, p_student_name text, p_date date, p_day text, p_time_cst text, p_time_hrs text, p_subject text, p_content text, p_hw text, p_additional_info text)
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

REVOKE ALL ON FUNCTION public.complete_class_atomic(uuid, text, text, text, date, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_class_atomic(uuid, text, text, text, date, text, text, text, text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_upcoming_classes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_upcoming_classes() TO service_role;

REVOKE ALL ON FUNCTION public.generate_class_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_class_notifications() TO service_role;

REVOKE ALL ON FUNCTION public.sync_user_roles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_roles() TO service_role;

REVOKE ALL ON FUNCTION public.log_critical_security_event(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_critical_security_event(text, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.log_enhanced_security_event(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_enhanced_security_event(text, text, uuid) TO service_role;

-- Separate finding: mutable search_path (not a role-exposure issue like the
-- above, just missing the same search_path pin every other function here has).
CREATE OR REPLACE FUNCTION public.set_stripe_webhook_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
