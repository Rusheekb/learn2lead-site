-- Enhanced role change validation and audit system

-- Create role change audit table with admin tracking
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view role change audit" ON public.role_change_audit
FOR SELECT USING (get_auth_user_role() = 'admin');

-- Update the role validation function for admin-initiated changes
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  initiating_user UUID;
BEGIN
  -- Get the current user role
  SELECT get_auth_user_role() INTO current_user_role;
  SELECT auth.uid() INTO initiating_user;
  
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
$function$;

-- Create function to safely promote student to tutor (admin only)
CREATE OR REPLACE FUNCTION public.promote_student_to_tutor(
  student_user_id UUID,
  reason TEXT DEFAULT 'Admin promotion'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_profile RECORD;
  result jsonb;
BEGIN
  -- Check if current user is admin
  IF get_auth_user_role() != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can promote users',
      'code', 'PERMISSION_DENIED'
    );
  END IF;
  
  -- Get current profile
  SELECT * INTO current_profile FROM profiles WHERE id = student_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;
  
  IF current_profile.role != 'student' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not a student',
      'code', 'INVALID_ROLE'
    );
  END IF;
  
  BEGIN
    -- Update profile role (this will trigger the validation function)
    UPDATE profiles 
    SET role = 'tutor', updated_at = now()
    WHERE id = student_user_id;
    
    -- Log the promotion
    INSERT INTO role_change_audit (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      student_user_id, 'student', 'tutor', auth.uid(), reason
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User successfully promoted to tutor',
      'user_id', student_user_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'PROMOTION_FAILED'
      );
  END;
END;
$function$;

-- Create function to safely demote tutor to student (admin only)
CREATE OR REPLACE FUNCTION public.demote_tutor_to_student(
  tutor_user_id UUID,
  reason TEXT DEFAULT 'Admin demotion'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_profile RECORD;
  active_students_count INTEGER;
  result jsonb;
BEGIN
  -- Check if current user is admin
  IF get_auth_user_role() != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can demote users',
      'code', 'PERMISSION_DENIED'
    );
  END IF;
  
  -- Get current profile
  SELECT * INTO current_profile FROM profiles WHERE id = tutor_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;
  
  IF current_profile.role != 'tutor' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not a tutor',
      'code', 'INVALID_ROLE'
    );
  END IF;
  
  -- Check for active student assignments
  SELECT COUNT(*) INTO active_students_count
  FROM tutor_student_assigned 
  WHERE tutor_id = tutor_user_id AND active = true;
  
  IF active_students_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot demote tutor with active student assignments',
      'code', 'HAS_ACTIVE_STUDENTS',
      'active_students', active_students_count
    );
  END IF;
  
  BEGIN
    -- Update profile role (this will trigger the validation function)
    UPDATE profiles 
    SET role = 'student', updated_at = now()
    WHERE id = tutor_user_id;
    
    -- Log the demotion
    INSERT INTO role_change_audit (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      tutor_user_id, 'tutor', 'student', auth.uid(), reason
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User successfully demoted to student',
      'user_id', tutor_user_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DEMOTION_FAILED'
      );
  END;
END;
$function$;