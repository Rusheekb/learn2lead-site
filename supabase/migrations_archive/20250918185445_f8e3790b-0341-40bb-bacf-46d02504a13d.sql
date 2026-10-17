-- Correct foreign keys on tutor_student_assigned to reference profiles, and add validation trigger

-- 1) Drop any existing foreign key constraints on tutor_student_assigned
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

-- 2) Recreate proper FKs pointing to profiles.id (we store profile/user ids in this table)
ALTER TABLE public.tutor_student_assigned
  ADD CONSTRAINT tutor_student_assigned_tutor_fk 
    FOREIGN KEY (tutor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT tutor_student_assigned_student_fk 
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3) Validation to prevent bad assignments (role check)
CREATE OR REPLACE FUNCTION public.validate_assignment_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Ensure tutor_id belongs to a user with tutor role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.tutor_id AND role = 'tutor'
  ) THEN
    RAISE EXCEPTION 'Invalid tutor_id: % (profile missing or not a tutor)', NEW.tutor_id;
  END IF;

  -- Ensure student_id belongs to a user with student role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.student_id AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Invalid student_id: % (profile missing or not a student)', NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_assignment_profiles_trigger ON public.tutor_student_assigned;
CREATE TRIGGER validate_assignment_profiles_trigger
  BEFORE INSERT OR UPDATE ON public.tutor_student_assigned
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_assignment_profiles();
