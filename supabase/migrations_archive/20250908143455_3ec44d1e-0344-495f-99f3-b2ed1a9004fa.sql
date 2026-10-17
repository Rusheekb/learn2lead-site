-- Improve duplicate detection and add constraints to prevent duplicate class logs

-- First, add a unique constraint to prevent duplicate class logs based on logical class data
ALTER TABLE public.class_logs 
ADD CONSTRAINT unique_class_log_per_session 
UNIQUE ("Tutor Name", "Student Name", "Date", "Time (CST)", "Subject");

-- Create an improved complete_class_atomic function with better duplicate detection
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
  result jsonb;
  class_exists boolean;
BEGIN
  -- Lock the row to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(p_class_id::text));
  
  -- Check if scheduled class still exists
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

  -- Check if class log already exists by Class ID
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

  -- Get actual names from scheduled_classes and profiles
  SELECT 
    CASE 
      WHEN TRIM(COALESCE(tp.first_name, '')) != '' OR TRIM(COALESCE(tp.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(tp.first_name, ''), ' ', COALESCE(tp.last_name, '')))
      ELSE 
        COALESCE(tp.email, 'Unknown Tutor')
    END,
    CASE 
      WHEN TRIM(COALESCE(sp.first_name, '')) != '' OR TRIM(COALESCE(sp.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, '')))
      ELSE 
        COALESCE(sp.email, 'Unknown Student')
    END
  INTO actual_tutor_name, actual_student_name
  FROM public.scheduled_classes sc
  LEFT JOIN public.profiles tp ON sc.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON sc.student_id = sp.id
  WHERE sc.id = p_class_id;
  
  -- Use actual names or fallback to provided names
  actual_tutor_name := COALESCE(actual_tutor_name, p_tutor_name, 'Unknown Tutor');
  actual_student_name := COALESCE(actual_student_name, p_student_name, 'Unknown Student');

  -- Check for duplicate based on logical class data (secondary check)
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

  -- Start transaction for atomic completion
  BEGIN
    -- Insert into class_logs with actual names
    INSERT INTO public.class_logs (
      "Class Number",
      "Tutor Name", 
      "Student Name",
      "Date",
      "Day",
      "Time (CST)",
      "Time (hrs)",
      "Subject",
      "Content",
      "HW",
      "Class ID",
      "Additional Info",
      "Student Payment",
      "Tutor Payment"
    ) VALUES (
      p_class_number,
      actual_tutor_name,
      actual_student_name,
      p_date,
      p_day,
      p_time_cst,
      p_time_hrs,
      p_subject,
      p_content,
      p_hw,
      p_class_id::text,
      p_additional_info,
      'Pending',
      'Pending'
    );

    -- Delete from scheduled_classes
    DELETE FROM public.scheduled_classes 
    WHERE id = p_class_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Class completed successfully',
      'tutor_name', actual_tutor_name,
      'student_name', actual_student_name
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Class session already logged',
        'code', 'DUPLICATE_SESSION'
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DATABASE_ERROR'
      );
  END;
END;
$function$;