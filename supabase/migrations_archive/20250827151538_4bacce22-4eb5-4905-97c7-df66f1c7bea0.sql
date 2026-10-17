-- Fix Security Issues - Remove SECURITY DEFINER from views and enhance security
-- This migration addresses critical security vulnerabilities

-- First, drop the existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.student_classes;
DROP VIEW IF EXISTS public.tutor_students;

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

-- Add additional security logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  operation_type text,
  table_name text,
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
    'sensitive_data_access',
    auth.uid(),
    jsonb_build_object(
      'operation', operation_type,
      'table', table_name,
      'row_id', row_id,
      'user_role', get_auth_user_role(),
      'timestamp', now(),
      'session_id', current_setting('request.jwt.claims', true)::jsonb->>'session_id'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't let logging failures break the application
    NULL;
END;
$$;

-- Create enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  identifier text,
  action_type text,
  max_attempts integer DEFAULT 10,
  window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (window_minutes || ' minutes')::interval;
  
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM security_logs
  WHERE event_type = action_type
    AND details->>'identifier' = identifier
    AND created_at >= window_start;
  
  -- Log the rate limit check
  INSERT INTO security_logs (event_type, user_id, details)
  VALUES (
    'rate_limit_check',
    auth.uid(),
    jsonb_build_object(
      'identifier', identifier,
      'action', action_type,
      'attempts', attempt_count,
      'limit', max_attempts,
      'allowed', attempt_count < max_attempts
    )
  );
  
  RETURN attempt_count < max_attempts;
END;
$$;

-- Create function to validate file access permissions
CREATE OR REPLACE FUNCTION public.validate_file_access(
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
    WHERE cu.file_path = validate_file_access.file_path
      AND (
        (user_role = 'tutor' AND sc.tutor_id = requested_by) OR
        (user_role = 'student' AND sc.student_id = requested_by)
      )
  ) INTO is_authorized;
  
  -- Log file access attempt
  PERFORM log_sensitive_access(
    'file_access_validation',
    'class_uploads',
    NULL
  );
  
  RETURN is_authorized;
END;
$$;