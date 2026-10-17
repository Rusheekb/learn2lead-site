-- Fix the student name function to properly handle empty names
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
    CASE 
      WHEN TRIM(COALESCE(p.first_name, '')) != '' OR TRIM(COALESCE(p.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
      ELSE 
        COALESCE(p.email, 'Student')
    END as student_name,
    tsa.tutor_id
  FROM tutor_student_assigned tsa
  LEFT JOIN profiles p ON tsa.student_id = p.id
  WHERE tsa.tutor_id = tutor_uuid 
  AND tsa.active = true;
END;
$function$