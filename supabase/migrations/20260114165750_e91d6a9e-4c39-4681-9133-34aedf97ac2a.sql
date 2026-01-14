-- RLS Security Hardening: Block anonymous access to sensitive tables
-- This migration adds policies to require authentication for data access

-- 1. Block anonymous access to profiles table
-- Drop any existing permissive policies that might allow anonymous access
DROP POLICY IF EXISTS "require_auth_profiles" ON public.profiles;

CREATE POLICY "require_auth_profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Block anonymous access to students table
DROP POLICY IF EXISTS "require_auth_students" ON public.students;

CREATE POLICY "require_auth_students" 
ON public.students 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Block anonymous access to class_logs table
DROP POLICY IF EXISTS "require_auth_class_logs" ON public.class_logs;

CREATE POLICY "require_auth_class_logs" 
ON public.class_logs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Add admin-only access policy for credit_discrepancies view
-- Note: Views inherit RLS from underlying tables, but we add explicit protection
DROP POLICY IF EXISTS "admin_access_credit_discrepancies" ON public.student_subscriptions;

-- Ensure admins can always access subscription data for credit analysis
CREATE POLICY "admin_full_access_subscriptions" 
ON public.student_subscriptions 
FOR ALL 
USING (
  auth.role() = 'authenticated' 
  AND (
    get_auth_user_role() = 'admin' 
    OR student_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON POLICY "require_auth_profiles" ON public.profiles IS 'Blocks anonymous access - requires authentication';
COMMENT ON POLICY "require_auth_students" ON public.students IS 'Blocks anonymous access - requires authentication';
COMMENT ON POLICY "require_auth_class_logs" ON public.class_logs IS 'Blocks anonymous access - requires authentication';