-- Security Hardening: Fix database function search paths and add security measures

-- 1. Fix search paths for all security-sensitive functions
CREATE OR REPLACE FUNCTION public.check_upcoming_classes()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    classes_cursor CURSOR FOR 
        SELECT sc.id, sc.title, sc.date, sc.start_time, sc.end_time, sc.zoom_link,
               sc.subject, t.email as tutor_email, t.name as tutor_name, 
               s.email as student_email, s.name as student_name
        FROM public.scheduled_classes sc
        JOIN public.tutors t ON sc.tutor_id = t.id
        JOIN public.students s ON sc.student_id = s.id
        WHERE 
            sc.reminder_sent = false
            AND sc.date = CURRENT_DATE
            AND sc.start_time BETWEEN 
                (CURRENT_TIME + interval '50 minutes') 
                AND (CURRENT_TIME + interval '70 minutes');
    
    class_record RECORD;
BEGIN
    OPEN classes_cursor;
    
    LOOP
        FETCH classes_cursor INTO class_record;
        EXIT WHEN NOT FOUND;
        
        UPDATE public.scheduled_classes 
        SET reminder_sent = true
        WHERE id = class_record.id;
        
        RAISE NOTICE 'Found upcoming class: % for % at %:%', 
                     class_record.title, class_record.student_name, 
                     class_record.date, class_record.start_time;
    END LOOP;
    
    CLOSE classes_cursor;
END;
$function$;

-- 2. Fix get_tutor_student_relationships function
CREATE OR REPLACE FUNCTION public.get_tutor_student_relationships(tutor_uuid uuid)
 RETURNS TABLE(relationship_id uuid, student_id uuid, student_name text, tutor_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tsa.id as relationship_id,
    tsa.student_id,
    CASE 
      WHEN TRIM(COALESCE(p.first_name, '')) != '' OR TRIM(COALESCE(p.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
      ELSE 
        COALESCE(p.email, 'Student')
    END as student_name,
    tsa.tutor_id
  FROM public.tutor_student_assigned tsa
  LEFT JOIN public.profiles p ON tsa.student_id = p.id
  WHERE tsa.tutor_id = tutor_uuid 
  AND tsa.active = true;
END;
$function$;

-- 3. Fix generate_class_notifications function
CREATE OR REPLACE FUNCTION public.generate_class_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  upcoming_class RECORD;
BEGIN
  FOR upcoming_class IN 
    SELECT 
      sc.id,
      sc.title,
      sc.date,
      sc.start_time,
      sc.tutor_id,
      sc.student_id
    FROM 
      public.scheduled_classes sc
    WHERE 
      sc.date = CURRENT_DATE
      AND sc.start_time::time - CURRENT_TIME BETWEEN interval '14 minutes' AND interval '16 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n 
        WHERE n.related_id = sc.id 
        AND n.type = 'class_reminder'
      )
  LOOP
    INSERT INTO public.notifications (user_id, message, type, related_id)
    VALUES (
      upcoming_class.tutor_id,
      'Class "' || upcoming_class.title || '" starts in 15 minutes.',
      'class_reminder',
      upcoming_class.id
    );
    
    INSERT INTO public.notifications (user_id, message, type, related_id)
    VALUES (
      upcoming_class.student_id,
      'Your class "' || upcoming_class.title || '" starts in 15 minutes.',
      'class_reminder',
      upcoming_class.id
    );
  END LOOP;
END;
$function$;

-- 4. Fix get_user_calendar_events function
CREATE OR REPLACE FUNCTION public.get_user_calendar_events(user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  feed TEXT := 'BEGIN:VCALENDAR' || chr(10) ||
               'VERSION:2.0' || chr(10) ||
               'PRODID:-//Learn2Lead//Tutoring Platform//EN' || chr(10);
  class_record RECORD;
  event_id TEXT;
  event_start TEXT;
  event_end TEXT;
BEGIN
  FOR class_record IN (
    SELECT 
      sc.id, 
      sc.title, 
      sc.date, 
      sc.start_time, 
      sc.end_time, 
      sc.subject, 
      sc.zoom_link, 
      sc.notes,
      sc.tutor_id,
      sc.student_id,
      t.name as tutor_name,
      s.name as student_name
    FROM 
      public.scheduled_classes sc
    LEFT JOIN 
      public.profiles t ON sc.tutor_id = t.id
    LEFT JOIN 
      public.profiles s ON sc.student_id = s.id
    WHERE 
      sc.tutor_id = user_id OR sc.student_id = user_id
  )
  LOOP
    event_start := to_char(class_record.date, 'YYYYMMDD') || 'T' || 
                   replace(to_char(class_record.start_time, 'HH24:MI:SS'), ':', '') || 'Z';
    event_end := to_char(class_record.date, 'YYYYMMDD') || 'T' || 
                 replace(to_char(class_record.end_time, 'HH24:MI:SS'), ':', '') || 'Z';
    event_id := replace(class_record.id::text, '-', '');
    
    feed := feed || 'BEGIN:VEVENT' || chr(10) ||
            'UID:' || event_id || chr(10) ||
            'DTSTAMP:' || to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYYMMDD"T"HH24MISS"Z"') || chr(10) ||
            'DTSTART:' || event_start || chr(10) ||
            'DTEND:' || event_end || chr(10) ||
            'SUMMARY:' || class_record.title || ' - ' || class_record.subject || chr(10);
            
    feed := feed || 'DESCRIPTION:' || coalesce(class_record.notes, '') ||
            '\\nTutor: ' || coalesce(class_record.tutor_name, '') || 
            '\\nStudent: ' || coalesce(class_record.student_name, '') || 
            '\\nZoom Link: ' || coalesce(class_record.zoom_link, '') || chr(10);
            
    IF class_record.zoom_link IS NOT NULL THEN
      feed := feed || 'LOCATION:Zoom Meeting' || chr(10);
      feed := feed || 'URL:' || class_record.zoom_link || chr(10);
    END IF;
    
    feed := feed || 'END:VEVENT' || chr(10);
  END LOOP;
  
  feed := feed || 'END:VCALENDAR';
  RETURN feed;
END;
$function$;

-- 5. Fix get_ics_feed function
CREATE OR REPLACE FUNCTION public.get_ics_feed(feed_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM public.profiles WHERE calendar_feed_id = feed_id;
  
  IF FOUND THEN
    RETURN public.get_user_calendar_events(user_id);
  ELSE
    RETURN 'ERROR: Invalid feed ID';
  END IF;
END;
$function$;

-- 6. Add security logging table
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  user_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access security logs
CREATE POLICY "Admins can access security logs" ON public.security_logs
FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'::app_role
);

-- 7. Add file upload validation table
CREATE TABLE IF NOT EXISTS public.file_validation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  validation_status text NOT NULL CHECK (validation_status IN ('passed', 'failed', 'suspicious')),
  validation_details jsonb,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on file validation logs
ALTER TABLE public.file_validation_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own validation logs, admins see all
CREATE POLICY "Users can see own validation logs" ON public.file_validation_logs
FOR SELECT USING (
  user_id = auth.uid() OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'::app_role
);

-- Only system can insert validation logs
CREATE POLICY "System can insert validation logs" ON public.file_validation_logs
FOR INSERT WITH CHECK (true);