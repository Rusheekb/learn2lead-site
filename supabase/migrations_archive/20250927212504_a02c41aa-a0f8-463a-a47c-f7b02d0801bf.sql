-- Fix the get_tutor_student_relationships function to handle errors better
CREATE OR REPLACE FUNCTION public.get_tutor_student_relationships(tutor_uuid uuid)
 RETURNS TABLE(relationship_id uuid, student_id uuid, student_name text, tutor_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Add error handling and validation
  IF tutor_uuid IS NULL THEN
    RAISE EXCEPTION 'Tutor UUID cannot be null';
  END IF;

  -- Verify tutor exists and has proper role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = tutor_uuid AND role = 'tutor'
  ) THEN
    RAISE EXCEPTION 'Invalid tutor or insufficient permissions';
  END IF;

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
  AND tsa.active = true
  ORDER BY student_name;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result
    RAISE WARNING 'Error in get_tutor_student_relationships: %', SQLERRM;
    RETURN;
END;
$function$