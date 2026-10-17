-- Standardize tutor_student_assigned to store profile IDs and fix Mahika/Ariana assignment
BEGIN;

-- 1) Drop any existing foreign key constraints (likely pointing to tutors/students)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.tutor_student_assigned'::regclass 
      AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.tutor_student_assigned DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Convert existing IDs to profile IDs using email mapping via tutors/students tables
-- Map tutor_id from tutors.id -> profiles.id (by matching email)
UPDATE public.tutor_student_assigned t
SET tutor_id = p.id
FROM public.tutors tu
JOIN public.profiles p ON p.email = tu.email
WHERE t.tutor_id = tu.id;

-- Map student_id from students.id -> profiles.id (by matching email)
UPDATE public.tutor_student_assigned t
SET student_id = p.id
FROM public.students st
JOIN public.profiles p ON p.email = st.email
WHERE t.student_id = st.id;

-- 3) Remove any rows still not resolvable to valid profiles
DELETE FROM public.tutor_student_assigned t
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.tutor_id)
   OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.student_id);

-- 4) Recreate proper FKs pointing to profiles.id (NOT VALID first, then validate)
ALTER TABLE public.tutor_student_assigned
  ADD CONSTRAINT tutor_student_assigned_tutor_fk 
    FOREIGN KEY (tutor_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT tutor_student_assigned_student_fk 
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.tutor_student_assigned
  VALIDATE CONSTRAINT tutor_student_assigned_tutor_fk,
  VALIDATE CONSTRAINT tutor_student_assigned_student_fk;

-- 5) Fix roles: Ariana should be tutor, Mahika should be student
UPDATE public.profiles SET role = 'tutor', updated_at = now() 
WHERE id = '4f131d47-1a1a-4aca-8e1d-a768e47648b0';

UPDATE public.profiles SET role = 'student', updated_at = now() 
WHERE id = '56dce104-cffa-4121-bda6-d0c901aa9b1b';

-- 6) Sync role-based tables (creates/removes rows in tutors/students by email)
SELECT public.sync_user_roles();

-- 7) Ensure the correct assignment exists (Ariana -> Mahika)
INSERT INTO public.tutor_student_assigned (tutor_id, student_id, active, assigned_at)
SELECT '4f131d47-1a1a-4aca-8e1d-a768e47648b0', '56dce104-cffa-4121-bda6-d0c901aa9b1b', true, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.tutor_student_assigned 
  WHERE tutor_id = '4f131d47-1a1a-4aca-8e1d-a768e47648b0' 
    AND student_id = '56dce104-cffa-4121-bda6-d0c901aa9b1b' 
    AND active = true
);

COMMIT;