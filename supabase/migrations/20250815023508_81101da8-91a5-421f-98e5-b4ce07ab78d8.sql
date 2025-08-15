-- Security Hardening: Fix Critical Database Vulnerabilities (Corrected)

-- 1. Secure database functions by adding SET search_path
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

-- 2. Create secure functions to replace views with proper RLS
CREATE OR REPLACE FUNCTION public.get_tutor_students(requesting_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
    tutor_id uuid,
    student_id uuid,
    student_name text,
    tutor_name text,
    subjects text[],
    grade text,
    payment_status text,
    active boolean,
    assigned_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  -- Check if user is admin, tutor, or student with proper permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = requesting_user_id 
    AND (
      role = 'admin' OR 
      (role = 'tutor' AND id = requesting_user_id) OR
      (role = 'student' AND id = requesting_user_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
      tsa.tutor_id,
      tsa.student_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as student_name,
      COALESCE(tp.first_name || ' ' || tp.last_name, tp.email) as tutor_name,
      s.subjects,
      s.grade,
      s.payment_status,
      tsa.active,
      tsa.assigned_at
  FROM public.tutor_student_assigned tsa
  LEFT JOIN public.profiles p ON tsa.student_id = p.id
  LEFT JOIN public.profiles tp ON tsa.tutor_id = tp.id
  LEFT JOIN public.students s ON tsa.student_id = s.id
  WHERE 
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'admin' THEN true
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'tutor' THEN tsa.tutor_id = requesting_user_id
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'student' THEN tsa.student_id = requesting_user_id
      ELSE false
    END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_student_classes(requesting_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
    id uuid,
    student_id uuid,
    tutor_id uuid,
    date date,
    title text,
    start_time time,
    end_time time,
    zoom_link text,
    subject text,
    notes text,
    status text,
    attendance text,
    tutor_name text,
    student_name text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  -- Check if user has proper permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = requesting_user_id 
    AND role IN ('admin', 'tutor', 'student')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
      sc.id,
      sc.student_id,
      sc.tutor_id,
      sc.date,
      sc.title,
      sc.start_time,
      sc.end_time,
      sc.zoom_link,
      sc.subject,
      sc.notes,
      sc.status,
      sc.attendance,
      COALESCE(tp.first_name || ' ' || tp.last_name, tp.email) as tutor_name,
      COALESCE(sp.first_name || ' ' || sp.last_name, sp.email) as student_name
  FROM public.scheduled_classes sc
  LEFT JOIN public.profiles tp ON sc.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON sc.student_id = sp.id
  WHERE 
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'admin' THEN true
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'tutor' THEN sc.tutor_id = requesting_user_id
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'student' THEN sc.student_id = requesting_user_id
      ELSE false
    END;
END;
$function$;