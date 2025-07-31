-- Update the get_tutor_student_relationships function to handle missing names better
CREATE OR REPLACE FUNCTION public.get_tutor_student_relationships(tutor_uuid uuid)
 RETURNS TABLE(relationship_id uuid, student_id uuid, student_name text, tutor_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tsa.id as relationship_id,
    tsa.student_id,
    COALESCE(
      CONCAT(TRIM(p.first_name), ' ', TRIM(p.last_name)),
      p.email,
      'Student'
    ) as student_name,
    tsa.tutor_id
  FROM tutor_student_assigned tsa
  LEFT JOIN profiles p ON tsa.student_id = p.id
  WHERE tsa.tutor_id = tutor_uuid 
  AND tsa.active = true;
END;
$function$