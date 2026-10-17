-- Stricter RLS: Remove overly permissive "authenticated only" policies
-- These allow any authenticated user to see all records
-- The specific role-based policies already exist and properly restrict access

-- 1. Remove permissive policy from profiles table
-- Tutors can already only see their assigned students via "Tutors can view limited student profile data"
DROP POLICY IF EXISTS "require_auth_profiles" ON public.profiles;

-- 2. Remove permissive policy from students table  
-- Tutors can already only see assigned students via "Allow tutors to select students"
DROP POLICY IF EXISTS "require_auth_students" ON public.students;

-- 3. Remove permissive policy from class_logs table
-- Tutors can already only see their own logs via "Tutors can select their own class logs"
DROP POLICY IF EXISTS "require_auth_class_logs" ON public.class_logs;

-- Add documentation comments explaining the security model
COMMENT ON TABLE public.profiles IS 'User profiles with strict RLS: users see own profile, tutors/students see their assigned counterparts only';
COMMENT ON TABLE public.students IS 'Student records with strict RLS: tutors see only assigned students via tutor_student_assigned';
COMMENT ON TABLE public.class_logs IS 'Class logs with strict RLS: tutors see only their own logs, students see only their own logs';