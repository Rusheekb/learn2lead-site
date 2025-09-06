-- Add unique constraint to prevent duplicate class log entries
ALTER TABLE public.class_logs 
ADD CONSTRAINT unique_class_id UNIQUE ("Class ID");

-- Create a function to handle class completion atomically
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
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_log_count integer;
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

  -- Start transaction
  BEGIN
    -- Insert into class_logs
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
      p_tutor_name,
      p_student_name,
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
      'message', 'Class completed successfully'
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