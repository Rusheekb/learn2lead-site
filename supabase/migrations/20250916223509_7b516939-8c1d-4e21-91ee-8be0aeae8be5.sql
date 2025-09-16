-- Fix role promotion authentication issues

-- Drop and recreate the promote_student_to_tutor function with better error handling
DROP FUNCTION IF EXISTS public.promote_student_to_tutor(uuid, text);

CREATE OR REPLACE FUNCTION public.promote_student_to_tutor(
  student_user_id uuid, 
  reason text DEFAULT 'Admin promotion'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_profile RECORD;
  current_admin_id UUID;
  current_admin_role TEXT;
  result jsonb;
BEGIN
  -- Get current user ID and role with explicit checks
  current_admin_id := auth.uid();
  
  IF current_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required - please log in again',
      'code', 'NOT_AUTHENTICATED'
    );
  END IF;
  
  -- Get current user role
  SELECT role INTO current_admin_role FROM profiles WHERE id = current_admin_id;
  
  IF current_admin_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found - please refresh and try again',
      'code', 'PROFILE_NOT_FOUND'
    );
  END IF;
  
  IF current_admin_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can promote users',
      'code', 'PERMISSION_DENIED'
    );
  END IF;
  
  -- Get target user profile
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
    -- Update profile role
    UPDATE profiles 
    SET role = 'tutor', updated_at = now()
    WHERE id = student_user_id;
    
    -- Log the promotion with explicit admin ID
    INSERT INTO role_change_audit (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      student_user_id, 'student', 'tutor', current_admin_id, reason
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
        'code', 'PROMOTION_FAILED',
        'details', SQLSTATE
      );
  END;
END;
$$;

-- Also fix the demote_tutor_to_student function with the same improvements
DROP FUNCTION IF EXISTS public.demote_tutor_to_student(uuid, text);

CREATE OR REPLACE FUNCTION public.demote_tutor_to_student(
  tutor_user_id uuid, 
  reason text DEFAULT 'Admin demotion'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_profile RECORD;
  current_admin_id UUID;
  current_admin_role TEXT;
  active_students_count INTEGER;
  result jsonb;
BEGIN
  -- Get current user ID and role with explicit checks
  current_admin_id := auth.uid();
  
  IF current_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required - please log in again',
      'code', 'NOT_AUTHENTICATED'
    );
  END IF;
  
  -- Get current user role
  SELECT role INTO current_admin_role FROM profiles WHERE id = current_admin_id;
  
  IF current_admin_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found - please refresh and try again',
      'code', 'PROFILE_NOT_FOUND'
    );
  END IF;
  
  IF current_admin_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can demote users',
      'code', 'PERMISSION_DENIED'
    );
  END IF;
  
  -- Get target user profile
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
    -- Update profile role
    UPDATE profiles 
    SET role = 'student', updated_at = now()
    WHERE id = tutor_user_id;
    
    -- Log the demotion with explicit admin ID
    INSERT INTO role_change_audit (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      tutor_user_id, 'tutor', 'student', current_admin_id, reason
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
        'code', 'DEMOTION_FAILED',
        'details', SQLSTATE
      );
  END;
END;
$$;