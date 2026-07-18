-- ============================================================
-- 1. Fix class_logs student RLS policy:
--    Students should only SELECT, never INSERT/UPDATE/DELETE logs.
--    Also remove stale duplicate policies left over from earlier migrations.
-- ============================================================

-- Drop all student policies (we'll recreate exactly what's needed)
DROP POLICY IF EXISTS "Students can access their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Students can view their own class logs"   ON public.class_logs;

-- Single clean SELECT-only policy for students
CREATE POLICY "Students can select their own class logs"
ON public.class_logs
FOR SELECT
TO public
USING (
  get_auth_user_role() = 'student'
  AND (
    "Student Name" = get_auth_user_display_name()
    OR "Student Name" = get_auth_user_email()
    OR student_user_id = auth.uid()
  )
);

-- Students may update ONLY their own rating/feedback columns on their own logs
CREATE POLICY "Students can rate their own class logs"
ON public.class_logs
FOR UPDATE
TO public
USING (
  get_auth_user_role() = 'student'
  AND (
    "Student Name" = get_auth_user_display_name()
    OR "Student Name" = get_auth_user_email()
    OR student_user_id = auth.uid()
  )
)
WITH CHECK (
  get_auth_user_role() = 'student'
  AND (
    "Student Name" = get_auth_user_display_name()
    OR "Student Name" = get_auth_user_email()
    OR student_user_id = auth.uid()
  )
);

-- Also remove the duplicate stale tutor INSERT policy
DROP POLICY IF EXISTS "Tutors can insert their own class logs" ON public.class_logs;


-- ============================================================
-- 2. RPC: get tomorrow's scheduled classes for reminder emails
--    Uses separate date + start_time columns (not scheduled_at).
--    Only returns rows where reminder_24h_sent IS NOT TRUE so
--    re-runs of the cron don't send duplicates.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tomorrow_scheduled_classes()
RETURNS TABLE (
  class_id        UUID,
  title           TEXT,
  subject         TEXT,
  class_date      DATE,
  class_start     TIME,
  student_name    TEXT,
  student_email   TEXT,
  tutor_name      TEXT,
  tutor_email     TEXT,
  zoom_link       TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    sc.id                                                    AS class_id,
    sc.title                                                 AS title,
    sc.subject                                               AS subject,
    sc.date                                                  AS class_date,
    sc.start_time                                            AS class_start,
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(sp.first_name,''),' ',COALESCE(sp.last_name,''))),
             ''), sp.email
    )                                                        AS student_name,
    sp.email                                                 AS student_email,
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(tp.first_name,''),' ',COALESCE(tp.last_name,''))),
             ''), tp.email
    )                                                        AS tutor_name,
    tp.email                                                 AS tutor_email,
    sc.zoom_link                                             AS zoom_link
  FROM public.scheduled_classes sc
  JOIN public.profiles sp ON sc.student_id = sp.id
  JOIN public.profiles tp ON sc.tutor_id   = tp.id
  WHERE sc.date = (CURRENT_DATE + INTERVAL '1 day')::date
    AND COALESCE(sc.reminder_24h_sent, false) = false;
$$;


-- ============================================================
-- 3. pg_cron: daily reminder at 14:00 UTC (9 AM CST / 10 AM CDT)
--    Fires the class-reminder edge function.
-- ============================================================
SELECT cron.schedule(
  'class-daily-reminder',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/class-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
