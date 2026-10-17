-- Create a function to get tutor student relationships with proper IDs
CREATE OR REPLACE FUNCTION get_tutor_student_relationships(tutor_uuid UUID)
RETURNS TABLE (
  relationship_id UUID,
  student_id UUID,
  student_name TEXT,
  tutor_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tsa.id as relationship_id,
    tsa.student_id,
    COALESCE(
      CONCAT(p.first_name, ' ', p.last_name),
      p.email,
      'Unnamed Student'
    ) as student_name,
    tsa.tutor_id
  FROM tutor_student_assigned tsa
  LEFT JOIN profiles p ON tsa.student_id = p.id
  WHERE tsa.tutor_id = tutor_uuid 
  AND tsa.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;