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

-- Create a view that combines scheduled and completed classes for better data access
CREATE OR REPLACE VIEW public.user_classes AS
SELECT 
  sc.id,
  sc.title as class_number,
  sc.subject,
  sc.date,
  sc.start_time as time_cst,
  EXTRACT(EPOCH FROM (sc.end_time - sc.start_time))/3600 as time_hrs,
  sc.tutor_id,
  sc.student_id,
  CASE 
    WHEN TRIM(COALESCE(tp.first_name, '')) != '' OR TRIM(COALESCE(tp.last_name, '')) != '' THEN
      TRIM(CONCAT(COALESCE(tp.first_name, ''), ' ', COALESCE(tp.last_name, '')))
    ELSE 
      COALESCE(tp.email, 'Unknown Tutor')
  END as tutor_name,
  CASE 
    WHEN TRIM(COALESCE(sp.first_name, '')) != '' OR TRIM(COALESCE(sp.last_name, '')) != '' THEN
      TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, '')))
    ELSE 
      COALESCE(sp.email, 'Unknown Student')
  END as student_name,
  sc.notes as additional_info,
  NULL as content,
  NULL as hw,
  sc.status,
  'scheduled' as class_type
FROM public.scheduled_classes sc
LEFT JOIN public.profiles tp ON sc.tutor_id = tp.id
LEFT JOIN public.profiles sp ON sc.student_id = sp.id

UNION ALL

SELECT 
  cl.id,
  cl."Class Number" as class_number,
  cl."Subject" as subject,
  cl."Date" as date,
  cl."Time (CST)" as time_cst,
  CASE 
    WHEN cl."Time (hrs)" ~ '^[0-9]+\.?[0-9]*$' THEN cl."Time (hrs)"::numeric
    ELSE 1.0
  END as time_hrs,
  -- Get tutor_id and student_id from profiles based on names, fallback to NULL
  (SELECT p.id FROM public.profiles p 
   WHERE TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) = cl."Tutor Name"
   OR p.email = cl."Tutor Name"
   LIMIT 1) as tutor_id,
  (SELECT p.id FROM public.profiles p 
   WHERE TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) = cl."Student Name"
   OR p.email = cl."Student Name"
   LIMIT 1) as student_id,
  cl."Tutor Name" as tutor_name,
  cl."Student Name" as student_name,
  cl."Additional Info" as additional_info,
  cl."Content" as content,
  cl."HW" as hw,
  'completed' as status,
  'completed' as class_type
FROM public.class_logs cl;

-- Grant permissions on the view
ALTER VIEW public.user_classes OWNER TO postgres;
GRANT ALL ON public.user_classes TO postgres;
GRANT ALL ON public.user_classes TO service_role;

-- Enable RLS on the view
ALTER VIEW public.user_classes SET (security_invoker = on);

-- Create RLS policies for the view
CREATE POLICY "Users can view their own classes in user_classes view"
ON public.user_classes
FOR SELECT
USING (
  (tutor_id = auth.uid()) OR 
  (student_id = auth.uid()) OR 
  (get_auth_user_role() = 'admin')
);