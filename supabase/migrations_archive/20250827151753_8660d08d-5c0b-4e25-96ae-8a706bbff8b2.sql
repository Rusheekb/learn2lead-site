-- Fix Security Issues - Remove SECURITY DEFINER from views and enhance security
-- This migration addresses critical security vulnerabilities

-- First, drop the existing views with SECURITY DEFINER  
DROP VIEW IF EXISTS public.student_classes;
DROP VIEW IF EXISTS public.tutor_students;

-- Drop existing conflicting function
DROP FUNCTION IF EXISTS public.log_sensitive_access(text, text, uuid);

-- Recreate student_classes view without SECURITY DEFINER
-- Views inherit RLS from underlying tables, so security is enforced through scheduled_classes table
CREATE VIEW public.student_classes AS
SELECT 
  sc.id,
  sc.student_id,
  sc.tutor_id,
  sc.date,
  sc.title,
  sc.start_time,
  sc.end_time,
  sc.zoom_link,
  sc.subject,
  sc.notes,
  sc.status,
  sc.attendance,
  COALESCE(tp.first_name || ' ' || tp.last_name, tp.email) as tutor_name,
  COALESCE(sp.first_name || ' ' || sp.last_name, sp.email) as student_name
FROM public.scheduled_classes sc
LEFT JOIN public.profiles tp ON sc.tutor_id = tp.id
LEFT JOIN public.profiles sp ON sc.student_id = sp.id;

-- Recreate tutor_students view without SECURITY DEFINER  
-- Views inherit RLS from underlying tables, so security is enforced through tutor_student_assigned table
CREATE VIEW public.tutor_students AS
SELECT 
  tsa.tutor_id,
  tsa.student_id,
  COALESCE(p.first_name || ' ' || p.last_name, p.email) as student_name,
  COALESCE(tp.first_name || ' ' || tp.last_name, tp.email) as tutor_name,
  s.subjects,
  s.grade,
  s.payment_status,
  tsa.active,
  tsa.assigned_at
FROM public.tutor_student_assigned tsa
LEFT JOIN public.profiles p ON tsa.student_id = p.id
LEFT JOIN public.profiles tp ON tsa.tutor_id = tp.id
LEFT JOIN public.students s ON tsa.student_id = s.id;

-- Create enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_enhanced_security_event(
  operation_type text,
  target_table text,
  row_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enhanced logging for sensitive operations
  INSERT INTO security_logs (event_type, user_id, details)
  VALUES (
    'enhanced_security_access',
    auth.uid(),
    jsonb_build_object(
      'operation', operation_type,
      'table', target_table,
      'row_id', row_id,
      'user_role', get_auth_user_role(),
      'timestamp', now()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't let logging failures break the application
    NULL;
END;
$$;

-- Create file access validation function
CREATE OR REPLACE FUNCTION public.validate_file_access_permissions(
  file_path text,
  requested_by uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  is_authorized boolean := false;
BEGIN
  -- Get user role
  SELECT get_auth_user_role() INTO user_role;
  
  -- Admin access
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user has access to the file through class uploads
  SELECT EXISTS(
    SELECT 1 FROM class_uploads cu
    JOIN scheduled_classes sc ON cu.class_id = sc.id
    WHERE cu.file_path = validate_file_access_permissions.file_path
      AND (
        (user_role = 'tutor' AND sc.tutor_id = requested_by) OR
        (user_role = 'student' AND sc.student_id = requested_by)
      )
  ) INTO is_authorized;
  
  -- Log file access attempt
  PERFORM log_enhanced_security_event(
    'file_access_validation',
    'class_uploads',
    NULL
  );
  
  RETURN is_authorized;
END;
$$;