-- Security hardening (found with the Supabase security advisor, 2026-10-16).
--
-- 1. get_class_log_totals returned revenue, tutor costs and unpaid amounts to
--    any caller holding the public anon key, with a name search that could
--    single out one student. It's only used by the admin Class Logs page, so
--    it now requires an admin.
-- 2. get_referral_usage_stats returned anyone's referral stats by user id.
--    It now answers only for the caller (or an admin).
-- 3. SECURITY DEFINER functions were executable by signed-out visitors (anon)
--    through PUBLIC's default EXECUTE. Only these stay callable signed out:
--      - policy helpers used by access rules on tables anon can query
--        (get_auth_user_role, get_auth_user_email, get_auth_user_display_name,
--        has_guardian, my_child_ids): they return nothing without a user;
--      - check_username (sign-up form) and get_public_referral_code
--        (referral landing page).
--    Trigger functions keep working: Postgres doesn't check EXECUTE when a
--    trigger fires. A test (supabase/tests) keeps this allowlist enforced.

CREATE OR REPLACE FUNCTION public.get_class_log_totals(p_search text DEFAULT NULL::text, p_date date DEFAULT NULL::date, p_payment_filter text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT jsonb_build_object(
    'total_class_cost', COALESCE(SUM("Class Cost"), 0),
    'total_tutor_cost', COALESCE(SUM("Tutor Cost"), 0),
    'pending_student', COALESCE(SUM(CASE WHEN student_payment_date IS NULL THEN "Class Cost" ELSE 0 END), 0),
    'pending_tutor', COALESCE(SUM(CASE WHEN tutor_payment_date IS NULL THEN "Tutor Cost" ELSE 0 END), 0),
    'total_count', COUNT(*)
  ) INTO result
  FROM public.class_logs
  WHERE
    (p_date IS NULL OR "Date" = p_date)
    AND (p_payment_filter IS NULL OR
      (p_payment_filter = 'student_unpaid' AND student_payment_date IS NULL) OR
      (p_payment_filter = 'student_paid' AND student_payment_date IS NOT NULL) OR
      (p_payment_filter = 'tutor_unpaid' AND tutor_payment_date IS NULL) OR
      (p_payment_filter = 'tutor_paid' AND tutor_payment_date IS NOT NULL)
    )
    AND (p_search IS NULL OR (
      "Class Number" ILIKE '%' || p_search || '%' OR
      "Tutor Name" ILIKE '%' || p_search || '%' OR
      "Student Name" ILIKE '%' || p_search || '%' OR
      "Subject" ILIKE '%' || p_search || '%' OR
      "Title" ILIKE '%' || p_search || '%'
    ));

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_referral_usage_stats(p_user_id uuid)
 RETURNS TABLE(times_used bigint, hours_earned numeric, latest_usage timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) as times_used,
    COUNT(*) * 1.0 as hours_earned,
    MAX(ru.used_at) as latest_usage
  FROM referral_usage ru
  JOIN referral_codes rc ON rc.id = ru.referral_code_id
  WHERE rc.created_by = p_user_id
    AND (p_user_id = auth.uid() OR get_auth_user_role() = 'admin');
$function$;

-- ─── Signed-out access ──────────────────────────────────────────────────────
-- Callable functions: signed-in users and the server keep access.
REVOKE EXECUTE ON FUNCTION
  public.demote_tutor_to_student(uuid, text),
  public.promote_student_to_tutor(uuid, text),
  public.get_class_log_totals(text, date, text),
  public.get_my_payroll_history(),
  public.get_referral_usage_stats(uuid),
  public.get_student_credit_balance(uuid),
  public.get_students_credit_summary(),
  public.get_tutor_student_relationships(uuid),
  public.is_guardian_of(uuid),
  public.require_admin_access()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.demote_tutor_to_student(uuid, text),
  public.promote_student_to_tutor(uuid, text),
  public.get_class_log_totals(text, date, text),
  public.get_my_payroll_history(),
  public.get_referral_usage_stats(uuid),
  public.get_student_credit_balance(uuid),
  public.get_students_credit_summary(),
  public.get_tutor_student_relationships(uuid),
  public.is_guardian_of(uuid),
  public.require_admin_access()
TO authenticated, service_role;

-- Trigger functions: nobody needs to call these directly.
REVOKE EXECUTE ON FUNCTION
  public.auto_create_class_log(),
  public.auto_sync_user_role(),
  public.enforce_class_logs_update_columns(),
  public.handle_new_user_profile(),
  public.log_class_cancellation(),
  public.profiles_parent_controls_guard(),
  public.profiles_username_guard(),
  public.sync_profile_name_from_roster(),
  public.sync_roster_name_from_profile(),
  public.sync_subscription_credits(),
  public.update_student_subscriptions_updated_at(),
  public.validate_role_change()
FROM PUBLIC, anon, authenticated;
