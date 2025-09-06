-- Update the complete_class_atomic function to use actual profile names
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
SET search_path = 'public'
AS $$
DECLARE
  existing_log_count integer;
  actual_tutor_name text;
  actual_student_name text;
  result jsonb;
BEGIN
  -- Check if class log already exists
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

  -- Start transaction
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
        'error', 'Class already completed',
        'code', 'ALREADY_COMPLETED'
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DATABASE_ERROR'
      );
  END;
END;
$$;