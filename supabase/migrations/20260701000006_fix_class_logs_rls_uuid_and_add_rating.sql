-- Fix class_logs RLS: add UUID-based matching so ClassHistory works even when
-- "Student Name" / "Tutor Name" text doesn't exactly match the profile display name.
-- Also adds student_rating / student_feedback columns for post-class feedback.

-- 1. Drop and recreate all class_logs policies with UUID fallback
DROP POLICY IF EXISTS "Students can access their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can select their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can insert class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can update their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can delete their own class logs" ON public.class_logs;

-- Students: name match (covers CSV-imported logs) OR UUID match (covers complete_class_atomic logs)
CREATE POLICY "Students can access their own class logs"
ON public.class_logs
FOR ALL
TO public
USING (
  get_auth_user_role() = 'student'
  AND (
    "Student Name" = get_auth_user_display_name()
    OR "Student Name" = get_auth_user_email()
    OR student_user_id = auth.uid()
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
    OR tutor_user_id = auth.uid()
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
    OR tutor_user_id = auth.uid()
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
    OR tutor_user_id = auth.uid()
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
    OR tutor_user_id = auth.uid()
  )
);

-- 2. Add student feedback columns
ALTER TABLE public.class_logs
  ADD COLUMN IF NOT EXISTS student_rating INTEGER CHECK (student_rating >= 1 AND student_rating <= 5),
  ADD COLUMN IF NOT EXISTS student_feedback TEXT;
