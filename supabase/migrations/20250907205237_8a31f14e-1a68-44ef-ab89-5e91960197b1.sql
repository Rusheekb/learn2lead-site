-- Drop existing RLS policies for class_logs
DROP POLICY IF EXISTS "Students can access their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can access their own class logs" ON public.class_logs;

-- Create updated RLS policies that handle both name and email matching
CREATE POLICY "Students can access their own class logs" 
ON public.class_logs 
FOR ALL 
USING (
  (get_auth_user_role() = 'student') AND (
    "Student Name" = (
      SELECT CASE 
        WHEN TRIM(COALESCE(profiles.first_name, '')) != '' OR TRIM(COALESCE(profiles.last_name, '')) != '' 
        THEN TRIM(CONCAT(COALESCE(profiles.first_name, ''), ' ', COALESCE(profiles.last_name, '')))
        ELSE profiles.email
      END
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
    OR "Student Name" = (
      SELECT profiles.email 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
);

CREATE POLICY "Tutors can access their own class logs" 
ON public.class_logs 
FOR ALL 
USING (
  (get_auth_user_role() = 'tutor') AND (
    "Tutor Name" = (
      SELECT CASE 
        WHEN TRIM(COALESCE(profiles.first_name, '')) != '' OR TRIM(COALESCE(profiles.last_name, '')) != '' 
        THEN TRIM(CONCAT(COALESCE(profiles.first_name, ''), ' ', COALESCE(profiles.last_name, '')))
        ELSE profiles.email
      END
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
    OR "Tutor Name" = (
      SELECT profiles.email 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
);