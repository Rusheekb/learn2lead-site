-- Fix role assignments and database inconsistencies
-- 1. Fix role assignment: Ariana Rayi should be tutor, Mahika Vura should be student
UPDATE public.profiles 
SET role = 'tutor', updated_at = now()
WHERE email = 'ariana.rayi@live.com';

UPDATE public.profiles 
SET role = 'student', updated_at = now()
WHERE email = 'mahika.vura@gmail.com';

-- 2. Create missing student record for Mahika Vura if it doesn't exist
INSERT INTO public.students (
  name,
  email,
  subjects,
  grade,
  payment_status,
  enrollment_date,
  active
) 
SELECT 
  CASE 
    WHEN TRIM(COALESCE(p.first_name, '')) != '' OR TRIM(COALESCE(p.last_name, '')) != '' THEN
      TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
    ELSE 
      p.email
  END,
  p.email,
  '{}',
  'Not specified',
  'paid',
  CURRENT_DATE,
  true
FROM public.profiles p
WHERE p.email = 'mahika.vura@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.email = p.email
  );

-- 3. Create missing tutor record for Ariana Rayi if it doesn't exist
INSERT INTO public.tutors (
  name,
  email,
  subjects,
  hourly_rate,
  active
) 
SELECT 
  CASE 
    WHEN TRIM(COALESCE(p.first_name, '')) != '' OR TRIM(COALESCE(p.last_name, '')) != '' THEN
      TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
    ELSE 
      p.email
  END,
  p.email,
  '{}',
  25,
  true
FROM public.profiles p
WHERE p.email = 'ariana.rayi@live.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.tutors t WHERE t.email = p.email
  );

-- 4. Delete incorrect assignment records
DELETE FROM public.tutor_student_assigned 
WHERE tutor_id NOT IN (SELECT id FROM public.profiles)
   OR student_id NOT IN (SELECT id FROM public.profiles);

-- 5. Create correct tutor-student assignment
INSERT INTO public.tutor_student_assigned (
  tutor_id,
  student_id,
  active,
  assigned_at
)
SELECT 
  t_prof.id as tutor_id,
  s_prof.id as student_id,
  true,
  now()
FROM public.profiles t_prof, public.profiles s_prof
WHERE t_prof.email = 'ariana.rayi@live.com'
  AND s_prof.email = 'mahika.vura@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.tutor_student_assigned tsa 
    WHERE tsa.tutor_id = t_prof.id 
      AND tsa.student_id = s_prof.id 
      AND tsa.active = true
  );

-- 6. Run role sync to ensure all data is consistent
SELECT public.sync_user_roles();