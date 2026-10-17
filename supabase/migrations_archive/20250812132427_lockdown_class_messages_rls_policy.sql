-- Remove overly permissive policies from class_messages
DROP POLICY IF EXISTS "Allow full access to class messages" ON public.class_messages;

-- Remove overly permissive policies from class_uploads
DROP POLICY IF EXISTS "Allow full access to class uploads" ON public.class_uploads;

-- Create secure policies for class_messages
-- Tutors can access messages for classes they teach
CREATE POLICY "Tutors can access their class messages" 
ON public.class_messages 
FOR ALL 
USING (
  get_auth_user_role() = 'tutor' AND EXISTS (
    SELECT 1 FROM scheduled_classes sc 
    WHERE sc.id = class_messages.class_id 
    AND sc.tutor_id = auth.uid()
  )
);

-- Students can access messages for classes they attend
CREATE POLICY "Students can access their class messages" 
ON public.class_messages 
FOR ALL 
USING (
  get_auth_user_role() = 'student' AND EXISTS (
    SELECT 1 FROM scheduled_classes sc 
    WHERE sc.id = class_messages.class_id 
    AND sc.student_id = auth.uid()
  )
);

-- Admins can access all class messages
CREATE POLICY "Admins can access all class messages" 
ON public.class_messages 
FOR ALL 
USING (get_auth_user_role() = 'admin');

-- Create secure policies for class_uploads
-- Tutors can access uploads for classes they teach
CREATE POLICY "Tutors can access their class uploads" 
ON public.class_uploads 
FOR ALL 
USING (
  get_auth_user_role() = 'tutor' AND EXISTS (
    SELECT 1 FROM scheduled_classes sc 
    WHERE sc.id = class_uploads.class_id 
    AND sc.tutor_id = auth.uid()
  )
);

-- Students can access uploads for classes they attend
CREATE POLICY "Students can access their class uploads" 
ON public.class_uploads 
FOR ALL 
USING (
  get_auth_user_role() = 'student' AND EXISTS (
    SELECT 1 FROM scheduled_classes sc 
    WHERE sc.id = class_uploads.class_id 
    AND sc.student_id = auth.uid()
  )
);

-- Admins can access all class uploads
CREATE POLICY "Admins can access all class uploads" 
ON public.class_uploads 
FOR ALL 
USING (get_auth_user_role() = 'admin');