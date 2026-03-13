
-- Drop the dead text columns that are superseded by date-based payment tracking
ALTER TABLE public.class_logs DROP COLUMN IF EXISTS "Student Payment";
ALTER TABLE public.class_logs DROP COLUMN IF EXISTS "Tutor Payment";

-- Update complete_class_atomic to not reference dropped columns
CREATE OR REPLACE FUNCTION public.complete_class_atomic(
  p_class_id uuid,
  p_class_number text,
  p_tutor_name text,
  p_student_name text,
  p_date date,
  p_day text,
  p_time_cst text,
  p_time_hrs text,
  p_subject text,
  p_content text,
  p_hw text,
  p_additional_info text
)
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
  result jsonb;
  class_exists boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_class_id::text));
  
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

  -- Get actual names, user IDs, AND rates via UUID-based joins
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
  
  actual_tutor_name := COALESCE(actual_tutor_name, p_tutor_name, 'Unknown Tutor');
  actual_student_name := COALESCE(actual_student_name, p_student_name, 'Unknown Student');

  SELECT COUNT(*) INTO existing_log_count
  FROM public.class_logs 
  WHERE "Tutor Name" = actual_tutor_name
    AND "Student Name" = actual_student_name
    AND "Date" = p_date
    AND "Time (CST)" = p_time_cst
    AND "Subject" = p_subject;
    
  IF existing_log_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A class log already exists for this session',
      'code', 'DUPLICATE_SESSION'
    );
  END IF;

  BEGIN
    INSERT INTO public.class_logs (
      "Class Number", "Tutor Name", "Student Name",
      "Date", "Day", "Time (CST)", "Time (hrs)",
      "Subject", "Content", "HW", "Class ID",
      "Additional Info", "Class Cost", "Tutor Cost",
      tutor_user_id, student_user_id
    ) VALUES (
      p_class_number, actual_tutor_name, actual_student_name,
      p_date, p_day, p_time_cst, p_time_hrs,
      p_subject, p_content, p_hw, p_class_id::text,
      p_additional_info, v_class_cost, v_tutor_cost,
      v_tutor_user_id, v_student_user_id
    );

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

-- Update auto_create_class_log trigger function to not reference dropped columns
CREATE OR REPLACE FUNCTION public.auto_create_class_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM public.class_logs WHERE "Class ID" = NEW.id::text) THEN
      INSERT INTO public.class_logs (
        "Class Number", "Tutor Name", "Student Name",
        "Date", "Day", "Time (CST)", "Time (hrs)",
        "Subject", "Content", "HW", "Class ID",
        "Additional Info",
        tutor_user_id, student_user_id
      )
      SELECT 
        NEW.title,
        COALESCE(tp.first_name || ' ' || tp.last_name, tp.email, 'Unknown Tutor'),
        COALESCE(sp.first_name || ' ' || sp.last_name, sp.email, 'Unknown Student'),
        NEW.date, to_char(NEW.date, 'Day'), NEW.start_time::text,
        EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/3600,
        NEW.subject, NEW.notes, NULL, NEW.id::text,
        CASE WHEN NEW.attendance IS NOT NULL THEN 'Attendance: ' || NEW.attendance ELSE NULL END,
        NEW.tutor_id, NEW.student_id
      FROM public.profiles tp, public.profiles sp
      WHERE tp.id = NEW.tutor_id AND sp.id = NEW.student_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
