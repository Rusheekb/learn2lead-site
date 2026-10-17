-- Make changed_by nullable to allow system changes

-- 1) Make changed_by nullable in role_change_audit
ALTER TABLE public.role_change_audit 
ALTER COLUMN changed_by DROP NOT NULL;

-- 2) Update the role validation trigger to handle system changes properly
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role TEXT;
  initiating_user UUID;
BEGIN
  -- Get the current user role and ID
  SELECT get_auth_user_role() INTO current_user_role;
  SELECT auth.uid() INTO initiating_user;
  
  -- If no authenticated user, this is a system operation (allow it)
  IF initiating_user IS NULL THEN
    -- Log the role change with NULL changed_by for system operations
    INSERT INTO role_change_audit (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      NEW.id, OLD.role::TEXT, NEW.role::TEXT, 
      NULL,  -- NULL for system operations
      'System role change'
    );
    RETURN NEW;
  END IF;
  
  -- Prevent users from changing their own role to admin unless they're already admin
  IF OLD.role != NEW.role AND NEW.role = 'admin' AND OLD.role != 'admin' THEN
    -- Log attempted privilege escalation
    INSERT INTO security_logs (event_type, user_id, details)
    VALUES (
      'privilege_escalation_attempt',
      auth.uid(),
      jsonb_build_object(
        'attempted_role', NEW.role,
        'current_role', OLD.role,
        'timestamp', now()
      )
    );
    
    RAISE EXCEPTION 'Admin role assignment requires manual approval';
  END IF;
  
  -- Allow admin to promote students to tutors
  IF OLD.role = 'student' AND NEW.role = 'tutor' AND current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can promote students to tutors';
  END IF;
  
  -- Allow admin to demote tutors to students  
  IF OLD.role = 'tutor' AND NEW.role = 'student' AND current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can demote tutors to students';
  END IF;
  
  -- Log all role changes for audit with admin info
  INSERT INTO role_change_audit (
    user_id, old_role, new_role, changed_by, reason
  ) VALUES (
    NEW.id, OLD.role::TEXT, NEW.role::TEXT, initiating_user, 
    CASE 
      WHEN OLD.role = 'student' AND NEW.role = 'tutor' THEN 'Admin promotion to tutor'
      WHEN OLD.role = 'tutor' AND NEW.role = 'student' THEN 'Admin demotion to student'
      ELSE 'Role change'
    END
  );
  
  RETURN NEW;
END;
$$;

-- 3) Fix roles: Ariana should be tutor, Mahika should be student
UPDATE public.profiles SET role = 'tutor', updated_at = now() 
WHERE id = '4f131d47-1a1a-4aca-8e1d-a768e47648b0';

UPDATE public.profiles SET role = 'student', updated_at = now() 
WHERE id = '56dce104-cffa-4121-bda6-d0c901aa9b1b';

-- 4) Sync role-based tables
SELECT public.sync_user_roles();

-- 5) Clean up tutor_student_assigned and convert to profile IDs
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