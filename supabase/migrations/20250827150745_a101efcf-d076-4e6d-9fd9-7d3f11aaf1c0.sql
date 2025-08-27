-- Fix Security Definer Views and Add Missing RLS Policies
-- This migration addresses critical security vulnerabilities

-- First, drop the existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.student_classes;
DROP VIEW IF EXISTS public.tutor_students;

-- Recreate student_classes view without SECURITY DEFINER
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

-- Enable RLS on both views (using security_barrier for views)
ALTER VIEW public.student_classes SET (security_barrier = true);
ALTER VIEW public.tutor_students SET (security_barrier = true);

-- Create RLS policies for student_classes view
-- Note: Views inherit RLS from their underlying tables, but we'll add explicit policies
CREATE POLICY "Students can view their own classes via view" 
ON public.student_classes
FOR SELECT 
USING (
  (get_auth_user_role() = 'student' AND student_id = auth.uid()) OR
  (get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()) OR
  (get_auth_user_role() = 'admin')
);

-- Create RLS policies for tutor_students view
CREATE POLICY "View tutor-student relationships via view" 
ON public.tutor_students
FOR SELECT 
USING (
  (get_auth_user_role() = 'student' AND student_id = auth.uid()) OR
  (get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()) OR  
  (get_auth_user_role() = 'admin')
);

-- Add security logging function for view access
CREATE OR REPLACE FUNCTION public.log_sensitive_view_access(view_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to sensitive views
  INSERT INTO security_logs (event_type, user_id, details)
  VALUES (
    'sensitive_view_access',
    auth.uid(),
    jsonb_build_object(
      'view_name', view_name,
      'access_time', now(),
      'user_role', get_auth_user_role()
    )
  );
END;
$$;