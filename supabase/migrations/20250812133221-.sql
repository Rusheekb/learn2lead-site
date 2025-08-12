-- Remove the overly permissive policy from class_logs
DROP POLICY IF EXISTS "Allow full access to class logs" ON public.class_logs;

-- Create policy for students to access their own class logs
CREATE POLICY "Students can access their own class logs" 
ON public.class_logs 
FOR ALL 
USING (
  get_auth_user_role() = 'student' AND "Student Name" = (
    SELECT concat(profiles.first_name, ' ', profiles.last_name) 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);