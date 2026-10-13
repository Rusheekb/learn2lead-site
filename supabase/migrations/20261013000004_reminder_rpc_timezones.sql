-- Time-zone support, step 4: class-reminder emails show each recipient's own
-- local time. The reminder job still runs once at 9 AM Central and picks the
-- next Central day's classes (unchanged); this adds the exact start/end and
-- both people's saved zones so each email can render in its recipient's zone.
--
-- The return type changes, so the function is dropped and recreated, with the
-- same backend-only grants it had (service_role only).

DROP FUNCTION IF EXISTS public.get_tomorrow_scheduled_classes();

CREATE FUNCTION public.get_tomorrow_scheduled_classes()
 RETURNS TABLE(
   class_id uuid,
   title text,
   subject text,
   class_date date,
   class_start time without time zone,
   start_at timestamptz,
   end_at timestamptz,
   student_name text,
   student_email text,
   student_timezone text,
   tutor_name text,
   tutor_email text,
   tutor_timezone text,
   zoom_link text,
   student_notify_reminders boolean,
   tutor_notify_reminders boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    sc.id                                                    AS class_id,
    sc.title                                                 AS title,
    sc.subject                                               AS subject,
    sc.date                                                  AS class_date,
    sc.start_time                                            AS class_start,
    sc.start_at                                              AS start_at,
    sc.end_at                                                AS end_at,
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(sp.first_name,''),' ',COALESCE(sp.last_name,''))),
             ''), sp.email
    )                                                        AS student_name,
    sp.email                                                 AS student_email,
    sp.timezone                                              AS student_timezone,
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(tp.first_name,''),' ',COALESCE(tp.last_name,''))),
             ''), tp.email
    )                                                        AS tutor_name,
    tp.email                                                 AS tutor_email,
    tp.timezone                                              AS tutor_timezone,
    sc.zoom_link                                             AS zoom_link,
    COALESCE(sp.notify_class_reminders, true)               AS student_notify_reminders,
    COALESCE(tp.notify_class_reminders, true)               AS tutor_notify_reminders
  FROM public.scheduled_classes sc
  JOIN public.profiles sp ON sc.student_id = sp.id
  JOIN public.profiles tp ON sc.tutor_id   = tp.id
  -- "Tomorrow" is the next Central calendar day (sc.date holds Central date).
  WHERE sc.date = ((now() AT TIME ZONE 'America/Chicago')::date + 1)
    AND COALESCE(sc.reminder_24h_sent, false) = false
    -- Skip entirely only if BOTH opted out; otherwise partial send handled in app
    AND (
      COALESCE(sp.notify_class_reminders, true) = true
      OR COALESCE(tp.notify_class_reminders, true) = true
    );
$function$;

REVOKE ALL ON FUNCTION public.get_tomorrow_scheduled_classes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tomorrow_scheduled_classes() TO service_role;
