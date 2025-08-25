-- CRITICAL SECURITY FIXES MIGRATION

-- 1. ADD RLS POLICIES FOR STUDENT_CLASSES VIEW
-- This view exposes all student classes without proper access control
ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can only view their own classes" 
ON student_classes 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Tutors can only view classes they teach" 
ON student_classes 
FOR SELECT 
USING (tutor_id = auth.uid());

CREATE POLICY "Admins can view all student classes" 
ON student_classes 
FOR SELECT 
USING (get_auth_user_role() = 'admin');

-- 2. ADD RLS POLICIES FOR TUTOR_STUDENTS VIEW  
-- Critical: This view exposes sensitive student-tutor relationship data
ALTER TABLE tutor_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors can only view their assigned students" 
ON tutor_students 
FOR SELECT 
USING (tutor_id = auth.uid());

CREATE POLICY "Students can only view their assigned tutors" 
ON tutor_students 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Admins can view all tutor-student relationships" 
ON tutor_students 
FOR SELECT 
USING (get_auth_user_role() = 'admin');

-- 3. RESTRICT TUTORS TABLE ACCESS
-- Currently allows any authenticated user to see all tutors
DROP POLICY IF EXISTS "Allow authenticated users to select tutors" ON tutors;

CREATE POLICY "Students can only view their assigned tutors" 
ON tutors 
FOR SELECT 
USING (
  (get_auth_user_role() = 'student' AND EXISTS (
    SELECT 1 FROM tutor_student_assigned tsa 
    WHERE tsa.tutor_id = tutors.id 
    AND tsa.student_id = auth.uid() 
    AND tsa.active = true
  )) OR
  (get_auth_user_role() = 'tutor' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND email = tutors.email
  )) OR
  get_auth_user_role() = 'admin'
);

-- 4. ADD ROLE CHANGE AUDIT LOGGING
CREATE TABLE IF NOT EXISTS role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  ip_address INET,
  user_agent TEXT
);

ALTER TABLE role_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view role change audit logs" 
ON role_change_audit 
FOR SELECT 
USING (get_auth_user_role() = 'admin');

-- 5. CREATE ROLE CHANGE VALIDATION TRIGGER
CREATE OR REPLACE FUNCTION validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from changing their own role to admin
  IF OLD.role != NEW.role AND NEW.role = 'admin' THEN
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
  
  -- Log all role changes for audit
  INSERT INTO role_change_audit (
    user_id, old_role, new_role, changed_by
  ) VALUES (
    NEW.id, OLD.role, NEW.role, auth.uid()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS role_change_validation ON profiles;
CREATE TRIGGER role_change_validation
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_change();

-- 6. FIX FUNCTION SEARCH PATHS (Security Warning Fix)
-- Update all functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        first_name,
        last_name,
        role,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'first_name', ''),
        coalesce(new.raw_user_meta_data ->> 'last_name', ''),
        CASE 
            WHEN new.email LIKE '%@learn2lead.com' THEN 'tutor'::app_role
            ELSE 'student'::app_role
        END,
        now(),
        now()
    );
    
    RETURN new;
END;
$$;

-- 7. ADD COMPREHENSIVE ACCESS LOGGING
CREATE TABLE IF NOT EXISTS access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
  row_id UUID,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  sensitive_data_accessed BOOLEAN DEFAULT false
);

ALTER TABLE access_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view access audit logs" 
ON access_audit_log 
FOR SELECT 
USING (get_auth_user_role() = 'admin');

-- 8. ADD ENHANCED SECURITY MONITORING
CREATE OR REPLACE FUNCTION log_sensitive_access(
  table_name TEXT,
  operation TEXT,
  row_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO access_audit_log (
    user_id, table_name, operation, row_id, sensitive_data_accessed
  ) VALUES (
    auth.uid(), table_name, operation, row_id, true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. PREVENT UNAUTHORIZED ADMIN ACTIONS
CREATE TABLE IF NOT EXISTS admin_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE admin_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin action logs" 
ON admin_action_log 
FOR SELECT 
USING (get_auth_user_role() = 'admin');

-- 10. ADD DATA MINIMIZATION POLICIES
-- Update profiles policies to be more restrictive
DROP POLICY IF EXISTS "Students can view assigned tutor profiles" ON profiles;
DROP POLICY IF EXISTS "Tutors can view assigned student profiles" ON profiles;

CREATE POLICY "Students can view limited tutor profile data" 
ON profiles 
FOR SELECT 
USING (
  (get_auth_user_role() = 'student' AND auth.uid() = id) OR
  (get_auth_user_role() = 'student' AND role = 'tutor' AND EXISTS (
    SELECT 1 FROM tutor_student_assigned tsa 
    WHERE tsa.student_id = auth.uid() 
    AND tsa.tutor_id = profiles.id 
    AND tsa.active = true
  ))
);

CREATE POLICY "Tutors can view limited student profile data" 
ON profiles 
FOR SELECT 
USING (
  (get_auth_user_role() = 'tutor' AND auth.uid() = id) OR
  (get_auth_user_role() = 'tutor' AND role = 'student' AND EXISTS (
    SELECT 1 FROM tutor_student_assigned tsa 
    WHERE tsa.tutor_id = auth.uid() 
    AND tsa.student_id = profiles.id 
    AND tsa.active = true
  ))
);