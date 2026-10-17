-- Add admin policy for notifications table
CREATE POLICY "Admins can do everything with notifications"
ON public.notifications
FOR ALL
USING (get_auth_user_role() = 'admin');