-- Authenticate cron-triggered edge functions with a shared secret.
--
-- class-reminder and admin-weekly-digest have never run: their cron jobs
-- built the Authorization header from current_setting('supabase.anon_key'),
-- which isn't set on this project, so they sent no credentials and the
-- gateway rejected every call with 401. send-weekly-digest and
-- cron-quarterly-reports did run, but with verify_jwt = false and no check
-- of their own — anyone with the URL could trigger them (the anon key their
-- jobs sent is public and proves nothing).
--
-- All four now require an `x-cron-secret` header (_shared/cronAuth.ts).
-- The jobs read it from Vault at run time; the value itself is created
-- out-of-band and never appears in this repo:
--   select vault.create_secret('<value>', 'cron_secret');
-- with the same value set as the CRON_SECRET edge-function secret.
--
-- cron.schedule() with an existing job name replaces that job in place.

SELECT cron.schedule(
  'class-daily-reminder',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/class-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

SELECT cron.schedule(
  'admin-weekly-digest',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/admin-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

SELECT cron.schedule(
  'send-weekly-student-digest',
  '0 14 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/send-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

SELECT cron.schedule(
  'quarterly-reports-generation',
  '0 9 1 1,4,7,10 *',
  $$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/cron-quarterly-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := concat('{"time": "', now(), '"}')::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- admin-weekly-digest reads these three admin-only functions with the
-- service-role key. They gate on get_auth_user_role() = 'admin', which is
-- always NULL for a backend caller (no auth.uid()), so they returned empty
-- and the digest would have reported nothing to flag. Also allow the
-- service role — which only the backend holds — while still returning
-- nothing to every other non-admin caller. Bodies otherwise unchanged.

CREATE OR REPLACE FUNCTION public.get_at_risk_students()
 RETURNS TABLE(student_name text, profile_id uuid, email text, credits_remaining numeric, last_class_date date, days_since_class integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin'
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
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

CREATE OR REPLACE FUNCTION public.get_zero_credit_upcoming_students()
 RETURNS TABLE(student_name text, profile_id uuid, email text, credits_remaining numeric, next_class_date date, next_class_title text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin'
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
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
    AND (public.get_auth_user_role() = 'admin' OR auth.role() = 'service_role')
  GROUP BY cl."Tutor Name", cl.tutor_user_id
  HAVING COUNT(*) > 0
  ORDER BY total_owed DESC NULLS LAST;
$function$;

-- Logged-out visitors only ever got an empty result from these; remove
-- their access entirely. Admins call them as 'authenticated'.
REVOKE EXECUTE ON FUNCTION public.get_at_risk_students() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_zero_credit_upcoming_students() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_tutor_unpaid_summary() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_at_risk_students() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_zero_credit_upcoming_students() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tutor_unpaid_summary() TO authenticated, service_role;
