-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with WITH CHECK that prevents role changes
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role::text = get_auth_user_role()
);