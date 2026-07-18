-- Update get_tomorrow_scheduled_classes to include per-user notification preferences.
-- The edge function uses these booleans to skip emails for users who have opted out.

DROP FUNCTION IF EXISTS public.get_tomorrow_scheduled_classes();

CREATE OR REPLACE FUNCTION public.get_tomorrow_scheduled_classes()
RETURNS TABLE (
  class_id                  UUID,
  title                     TEXT,
  subject                   TEXT,
  class_date                DATE,
  class_start               TIME,
  student_name              TEXT,
  student_email             TEXT,
  tutor_name                TEXT,
  tutor_email               TEXT,
  zoom_link                 TEXT,
  student_notify_reminders  BOOLEAN,
  tutor_notify_reminders    BOOLEAN
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
    sc.zoom_link                                             AS zoom_link,
    COALESCE(sp.notify_class_reminders, true)               AS student_notify_reminders,
    COALESCE(tp.notify_class_reminders, true)               AS tutor_notify_reminders
  FROM public.scheduled_classes sc
  JOIN public.profiles sp ON sc.student_id = sp.id
  JOIN public.profiles tp ON sc.tutor_id   = tp.id
  WHERE sc.date = (CURRENT_DATE + INTERVAL '1 day')::date
    AND COALESCE(sc.reminder_24h_sent, false) = false
    -- Skip entirely only if BOTH opted out; otherwise partial send handled in app
    AND (
      COALESCE(sp.notify_class_reminders, true) = true
      OR COALESCE(tp.notify_class_reminders, true) = true
    );
$$;
