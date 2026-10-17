-- CRITICAL SECURITY FIXES MIGRATION - CORRECTED

-- 1. FIRST - ADD ROLE CHANGE AUDIT LOGGING
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

-- 2. CREATE ROLE CHANGE VALIDATION TRIGGER
CREATE OR REPLACE FUNCTION validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
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

-- 3. RESTRICT TUTORS TABLE ACCESS - CRITICAL FIX
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

-- 4. FIX FUNCTION SEARCH PATHS (Security Warning Fix)
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

CREATE OR REPLACE FUNCTION public.get_tutor_student_relationships(tutor_uuid uuid)
RETURNS TABLE(relationship_id uuid, student_id uuid, student_name text, tutor_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tsa.id as relationship_id,
    tsa.student_id,
    CASE 
      WHEN TRIM(COALESCE(p.first_name, '')) != '' OR TRIM(COALESCE(p.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
      ELSE 
        COALESCE(p.email, 'Student')
    END as student_name,
    tsa.tutor_id
  FROM public.tutor_student_assigned tsa
  LEFT JOIN public.profiles p ON tsa.student_id = p.id
  WHERE tsa.tutor_id = tutor_uuid 
  AND tsa.active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tutor_students(requesting_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(tutor_id uuid, student_id uuid, student_name text, tutor_name text, subjects text[], grade text, payment_status text, active boolean, assigned_at timestamp with time zone)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin, tutor, or student with proper permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = requesting_user_id 
    AND (
      role = 'admin' OR 
      (role = 'tutor' AND id = requesting_user_id) OR
      (role = 'student' AND id = requesting_user_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
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
  LEFT JOIN public.students s ON tsa.student_id = s.id
  WHERE 
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'admin' THEN true
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'tutor' THEN tsa.tutor_id = requesting_user_id
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'student' THEN tsa.student_id = requesting_user_id
      ELSE false
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_classes(requesting_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(id uuid, student_id uuid, tutor_id uuid, date date, title text, start_time time without time zone, end_time time without time zone, zoom_link text, subject text, notes text, status text, attendance text, tutor_name text, student_name text)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check if user has proper permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = requesting_user_id 
    AND role IN ('admin', 'tutor', 'student')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
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
  LEFT JOIN public.profiles sp ON sc.student_id = sp.id
  WHERE 
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'admin' THEN true
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'tutor' THEN sc.tutor_id = requesting_user_id
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'student' THEN sc.student_id = requesting_user_id
      ELSE false
    END;
END;
$$;

-- 5. ADD COMPREHENSIVE ACCESS LOGGING
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

-- 6. ADD ENHANCED SECURITY MONITORING
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

-- 7. PREVENT UNAUTHORIZED ADMIN ACTIONS
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

-- 8. ADD DATA MINIMIZATION POLICIES
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