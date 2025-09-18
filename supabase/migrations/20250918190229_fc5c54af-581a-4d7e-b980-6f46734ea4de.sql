-- Fix the assignment issue with proper system role changes

-- 1) First, temporarily disable the role validation trigger
DROP TRIGGER IF EXISTS validate_role_change ON public.profiles;

-- 2) Fix roles: Ariana should be tutor, Mahika should be student
UPDATE public.profiles SET role = 'tutor', updated_at = now() 
WHERE id = '4f131d47-1a1a-4aca-8e1d-a768e47648b0';

UPDATE public.profiles SET role = 'student', updated_at = now() 
WHERE id = '56dce104-cffa-4121-bda6-d0c901aa9b1b';

-- 3) Log the role changes manually with system user
INSERT INTO role_change_audit (user_id, old_role, new_role, changed_by, reason)
VALUES 
  ('4f131d47-1a1a-4aca-8e1d-a768e47648b0', 'student', 'tutor', '00000000-0000-0000-0000-000000000000', 'System role correction'),
  ('56dce104-cffa-4121-bda6-d0c901aa9b1b', 'tutor', 'student', '00000000-0000-0000-0000-000000000000', 'System role correction');

-- 4) Re-enable the trigger
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.validate_role_change();

-- 5) Sync role-based tables
SELECT public.sync_user_roles();

-- 6) Clean up tutor_student_assigned and convert to profile IDs
BEGIN;

-- Drop existing foreign keys
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

-- Map existing tutor_id from tutors.id -> profiles.id (by email)
UPDATE public.tutor_student_assigned t
SET tutor_id = p.id
FROM public.tutors tu
JOIN public.profiles p ON p.email = tu.email
WHERE t.tutor_id = tu.id;

-- Map existing student_id from students.id -> profiles.id (by email)
UPDATE public.tutor_student_assigned t
SET student_id = p.id
FROM public.students st
JOIN public.profiles p ON p.email = st.email
WHERE t.student_id = st.id;

-- Remove any assignments with invalid profile IDs
DELETE FROM public.tutor_student_assigned t
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.tutor_id)
   OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.student_id);

-- Add new foreign keys to profiles
ALTER TABLE public.tutor_student_assigned
  ADD CONSTRAINT tutor_student_assigned_tutor_fk 
    FOREIGN KEY (tutor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT tutor_student_assigned_student_fk 
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure Ariana (tutor) -> Mahika (student) assignment exists
INSERT INTO public.tutor_student_assigned (tutor_id, student_id, active, assigned_at)
SELECT '4f131d47-1a1a-4aca-8e1d-a768e47648b0', '56dce104-cffa-4121-bda6-d0c901aa9b1b', true, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.tutor_student_assigned 
  WHERE tutor_id = '4f131d47-1a1a-4aca-8e1d-a768e47648b0' 
    AND student_id = '56dce104-cffa-4121-bda6-d0c901aa9b1b' 
    AND active = true
);

COMMIT;