-- Remove the overly permissive policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;

-- Remove duplicate tutor policies and replace with more secure ones
DROP POLICY IF EXISTS "Tutors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tutors can view other profiles" ON public.profiles;

-- Create secure policy for tutors to only view profiles of their assigned students
CREATE POLICY "Tutors can view assigned student profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (get_auth_user_role() = 'tutor' AND auth.uid() = id) OR
  (get_auth_user_role() = 'tutor' AND EXISTS (
    SELECT 1 FROM tutor_student_assigned tsa 
    WHERE tsa.tutor_id = auth.uid() 
    AND tsa.student_id = profiles.id 
    AND tsa.active = true
  ))
);

-- Create secure policy for students to view profiles of their assigned tutors
CREATE POLICY "Students can view assigned tutor profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (get_auth_user_role() = 'student' AND auth.uid() = id) OR
  (get_auth_user_role() = 'student' AND EXISTS (
    SELECT 1 FROM tutor_student_assigned tsa 
    WHERE tsa.student_id = auth.uid() 
    AND tsa.tutor_id = profiles.id 
    AND tsa.active = true
  ))
);