-- Fix the tutor-student assignment issue (corrected approach)

-- 1. Delete the incorrect assignment record with invalid profile IDs
DELETE FROM public.tutor_student_assigned 
WHERE id = 'cb10a79a-7f9f-4e16-8297-aab3bef71edc';

-- 2. Fix role issues - Ariana Rayi should be tutor, Mahika Vura should be student
UPDATE public.profiles 
SET role = 'tutor', updated_at = now()
WHERE id = '4f131d47-1a1a-4aca-8e1d-a768e47648b0' AND email = 'ariana@example.com';

UPDATE public.profiles 
SET role = 'student', updated_at = now()
WHERE id = '56dce104-cffa-4121-bda6-d0c901aa9b1b' AND email = 'mahika@example.com';

-- 3. Ensure data consistency by running role sync FIRST
SELECT public.sync_user_roles();

-- 4. Now create the assignment record (using profile IDs that should now have corresponding tutor/student records)
INSERT INTO public.tutor_student_assigned (
  tutor_id, 
  student_id, 
  active, 
  assigned_at
) VALUES (
  '4f131d47-1a1a-4aca-8e1d-a768e47648b0', -- Ariana Rayi (tutor)
  '56dce104-cffa-4121-bda6-d0c901aa9b1b', -- Mahika Vura (student)
  true,
  now()
);