-- FIX REMAINING FUNCTIONS WITH MISSING SEARCH PATHS

-- 1. Fix generate_class_notifications
CREATE OR REPLACE FUNCTION public.generate_class_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 2. Fix get_ics_feed
CREATE OR REPLACE FUNCTION public.get_ics_feed(feed_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 3. Fix get_user_calendar_events
CREATE OR REPLACE FUNCTION public.get_user_calendar_events(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      t.first_name || ' ' || t.last_name as tutor_name,
      s.first_name || ' ' || s.last_name as student_name
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
$$;

-- 4. Fix handle_rest_get_ics
CREATE OR REPLACE FUNCTION public.handle_rest_get_ics(request jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  feed_id UUID;
  feed_content TEXT;
BEGIN
  -- Get the feed ID from the request URL
  feed_id := (request->'params'->>'id')::UUID;
  
  -- Get the feed content
  feed_content := public.get_ics_feed(feed_id);
  
  -- Return the feed as text with proper headers
  RETURN jsonb_build_object(
    'status', 200,
    'body', feed_content,
    'headers', jsonb_build_object(
      'Content-Type', 'text/calendar',
      'Content-Disposition', 'attachment; filename="calendar.ics"'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 404,
      'body', 'Calendar feed not found'
    );
END;
$$;