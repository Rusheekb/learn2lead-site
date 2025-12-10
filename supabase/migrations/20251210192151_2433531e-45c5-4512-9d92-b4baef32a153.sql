-- Add proper INSERT policy for tutors on class_logs
-- The existing "Tutors can access their own class logs" policy uses ALL with USING clause,
-- but INSERT operations require WITH CHECK clause

-- Drop the existing ALL policy for tutors and create separate policies
DROP POLICY IF EXISTS "Tutors can access their own class logs" ON public.class_logs;

-- Create SELECT policy for tutors
CREATE POLICY "Tutors can select their own class logs" 
ON public.class_logs 
FOR SELECT 
USING (
  (get_auth_user_role() = 'tutor'::text) AND (
    ("Tutor Name" = (
      SELECT CASE
        WHEN (TRIM(BOTH FROM COALESCE(profiles.first_name, ''::text)) <> ''::text) 
          OR (TRIM(BOTH FROM COALESCE(profiles.last_name, ''::text)) <> ''::text) 
        THEN TRIM(BOTH FROM concat(COALESCE(profiles.first_name, ''::text), ' ', COALESCE(profiles.last_name, ''::text)))
        ELSE profiles.email
      END
      FROM profiles WHERE profiles.id = auth.uid()
    )) 
    OR ("Tutor Name" = (SELECT profiles.email FROM profiles WHERE profiles.id = auth.uid()))
  )
);

-- Create INSERT policy for tutors with proper WITH CHECK clause
CREATE POLICY "Tutors can insert class logs" 
ON public.class_logs 
FOR INSERT 
WITH CHECK (
  (get_auth_user_role() = 'tutor'::text) AND (
    ("Tutor Name" = (
      SELECT CASE
        WHEN (TRIM(BOTH FROM COALESCE(profiles.first_name, ''::text)) <> ''::text) 
          OR (TRIM(BOTH FROM COALESCE(profiles.last_name, ''::text)) <> ''::text) 
        THEN TRIM(BOTH FROM concat(COALESCE(profiles.first_name, ''::text), ' ', COALESCE(profiles.last_name, ''::text)))
        ELSE profiles.email
      END
      FROM profiles WHERE profiles.id = auth.uid()
    )) 
    OR ("Tutor Name" = (SELECT profiles.email FROM profiles WHERE profiles.id = auth.uid()))
  )
);

-- Create UPDATE policy for tutors
CREATE POLICY "Tutors can update their own class logs" 
ON public.class_logs 
FOR UPDATE 
USING (
  (get_auth_user_role() = 'tutor'::text) AND (
    ("Tutor Name" = (
      SELECT CASE
        WHEN (TRIM(BOTH FROM COALESCE(profiles.first_name, ''::text)) <> ''::text) 
          OR (TRIM(BOTH FROM COALESCE(profiles.last_name, ''::text)) <> ''::text) 
        THEN TRIM(BOTH FROM concat(COALESCE(profiles.first_name, ''::text), ' ', COALESCE(profiles.last_name, ''::text)))
        ELSE profiles.email
      END
      FROM profiles WHERE profiles.id = auth.uid()
    )) 
    OR ("Tutor Name" = (SELECT profiles.email FROM profiles WHERE profiles.id = auth.uid()))
  )
);

-- Create DELETE policy for tutors (optional, but maintains parity)
CREATE POLICY "Tutors can delete their own class logs" 
ON public.class_logs 
FOR DELETE 
USING (
  (get_auth_user_role() = 'tutor'::text) AND (
    ("Tutor Name" = (
      SELECT CASE
        WHEN (TRIM(BOTH FROM COALESCE(profiles.first_name, ''::text)) <> ''::text) 
          OR (TRIM(BOTH FROM COALESCE(profiles.last_name, ''::text)) <> ''::text) 
        THEN TRIM(BOTH FROM concat(COALESCE(profiles.first_name, ''::text), ' ', COALESCE(profiles.last_name, ''::text)))
        ELSE profiles.email
      END
      FROM profiles WHERE profiles.id = auth.uid()
    )) 
    OR ("Tutor Name" = (SELECT profiles.email FROM profiles WHERE profiles.id = auth.uid()))
  )
);