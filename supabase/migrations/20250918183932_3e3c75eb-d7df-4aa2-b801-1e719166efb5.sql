-- Fix tutor-student visibility issues by using email-based matching

-- 1. Update students RLS policy to allow tutors to see their assigned students by email
DROP POLICY IF EXISTS "Allow tutors to select students" ON public.students;

CREATE POLICY "Allow tutors to select students" 
ON public.students 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tutor_student_assigned tsa
    JOIN public.profiles tutor_profile ON tsa.tutor_id = tutor_profile.id
    JOIN public.profiles student_profile ON tsa.student_id = student_profile.id
    WHERE tutor_profile.id = auth.uid()
      AND student_profile.email = students.email
      AND tsa.active = true
  )
);

-- 2. Update the get_tutor_students function to return proper data with email-based joins
CREATE OR REPLACE FUNCTION public.get_tutor_students_by_email(requesting_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  tutor_id uuid, 
  student_id uuid, 
  student_name text, 
  student_email text,
  tutor_name text, 
  subjects text[], 
  grade text, 
  payment_status text, 
  active boolean, 
  assigned_at timestamp with time zone
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin, tutor, or student with proper permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = requesting_user_id 
    AND role IN ('admin', 'tutor', 'student')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
      tsa.tutor_id,
      tsa.student_id,
      CASE 
        WHEN TRIM(COALESCE(sp.first_name, '')) != '' OR TRIM(COALESCE(sp.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, '')))
        ELSE 
          sp.email
      END as student_name,
      sp.email as student_email,
      CASE 
        WHEN TRIM(COALESCE(tp.first_name, '')) != '' OR TRIM(COALESCE(tp.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(tp.first_name, ''), ' ', COALESCE(tp.last_name, '')))
        ELSE 
          tp.email
      END as tutor_name,
      COALESCE(s.subjects, '{}') as subjects,
      COALESCE(s.grade, 'Not specified') as grade,
      COALESCE(s.payment_status, 'paid') as payment_status,
      tsa.active,
      tsa.assigned_at
  FROM public.tutor_student_assigned tsa
  LEFT JOIN public.profiles tp ON tsa.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON tsa.student_id = sp.id
  LEFT JOIN public.students s ON sp.email = s.email
  WHERE 
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'admin' THEN true
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'tutor' THEN tsa.tutor_id = requesting_user_id
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'student' THEN tsa.student_id = requesting_user_id
      ELSE false
    END
    AND tsa.active = true;
END;
$function$;

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_tutor_student_assigned_active ON public.tutor_student_assigned(active) WHERE active = true;