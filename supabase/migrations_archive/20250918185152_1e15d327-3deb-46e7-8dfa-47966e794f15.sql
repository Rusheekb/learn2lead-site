-- Fix the tutor-student assignment issue

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

-- 3. Create correct assignment record
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

-- 4. Ensure data consistency by running role sync
SELECT public.sync_user_roles();

-- 5. Add validation function to prevent future assignments with invalid profile IDs
CREATE OR REPLACE FUNCTION public.validate_assignment_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if tutor_id exists and has tutor role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.tutor_id AND role = 'tutor'
  ) THEN
    RAISE EXCEPTION 'Invalid tutor ID: % does not exist or is not a tutor', NEW.tutor_id;
  END IF;
  
  -- Check if student_id exists and has student role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.student_id AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Invalid student ID: % does not exist or is not a student', NEW.student_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate assignments before insert/update
CREATE TRIGGER validate_assignment_profiles_trigger
  BEFORE INSERT OR UPDATE ON public.tutor_student_assigned
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_assignment_profiles();