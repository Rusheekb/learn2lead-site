
-- Create security definer functions for user display name and email lookups
-- These replace the expensive inline subqueries in class_logs RLS policies

CREATE OR REPLACE FUNCTION public.get_auth_user_display_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN TRIM(COALESCE(first_name, '')) != '' OR TRIM(COALESCE(last_name, '')) != ''
      THEN TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
      ELSE email
    END
  FROM public.profiles
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid()
$$;

-- Drop all existing class_logs policies (except admin)
DROP POLICY IF EXISTS "Students can access their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can delete their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can insert class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can select their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can update their own class logs" ON public.class_logs;

-- Recreate with security definer functions instead of subqueries

CREATE POLICY "Students can access their own class logs"
ON public.class_logs
FOR ALL
TO public
USING (
  get_auth_user_role() = 'student'
  AND (
    "Student Name" = get_auth_user_display_name()
    OR "Student Name" = get_auth_user_email()
  )
);

CREATE POLICY "Tutors can select their own class logs"
ON public.class_logs
FOR SELECT
TO public
USING (
  get_auth_user_role() = 'tutor'
  AND (
    "Tutor Name" = get_auth_user_display_name()
    OR "Tutor Name" = get_auth_user_email()
  )
);

CREATE POLICY "Tutors can insert class logs"
ON public.class_logs
FOR INSERT
TO public
WITH CHECK (
  get_auth_user_role() = 'tutor'
  AND (
    "Tutor Name" = get_auth_user_display_name()
    OR "Tutor Name" = get_auth_user_email()
  )
);

CREATE POLICY "Tutors can update their own class logs"
ON public.class_logs
FOR UPDATE
TO public
USING (
  get_auth_user_role() = 'tutor'
  AND (
    "Tutor Name" = get_auth_user_display_name()
    OR "Tutor Name" = get_auth_user_email()
  )
);

CREATE POLICY "Tutors can delete their own class logs"
ON public.class_logs
FOR DELETE
TO public
USING (
  get_auth_user_role() = 'tutor'
  AND (
    "Tutor Name" = get_auth_user_display_name()
    OR "Tutor Name" = get_auth_user_email()
  )
);
