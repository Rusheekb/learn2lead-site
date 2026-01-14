-- Add missing admin policies for tutors and scheduled_classes tables

-- Admin policy for tutors table
CREATE POLICY "Admins can do everything with tutors"
ON public.tutors
FOR ALL
USING (get_auth_user_role() = 'admin');

-- Admin policy for scheduled_classes table
CREATE POLICY "Admins can do everything with scheduled_classes"
ON public.scheduled_classes
FOR ALL
USING (get_auth_user_role() = 'admin');