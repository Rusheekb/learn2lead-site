-- Create the missing tutor-student relationship
INSERT INTO tutor_student_assigned (tutor_id, student_id, active, subject)
SELECT 
  t.id as tutor_id,
  s.id as student_id, 
  true as active,
  'General' as subject
FROM 
  profiles t 
  CROSS JOIN profiles s
WHERE 
  t.role = 'tutor' 
  AND s.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM tutor_student_assigned tsa 
    WHERE tsa.tutor_id = t.id AND tsa.student_id = s.id
  );