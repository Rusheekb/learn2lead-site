-- FINAL SECURITY FIXES

-- 1. MOVE pg_net EXTENSION OUT OF PUBLIC SCHEMA
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension to extensions schema
-- Note: We can't directly ALTER EXTENSION, so we'll drop and recreate
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. GRANT NECESSARY PERMISSIONS FOR pg_net usage
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 3. ADD ADDITIONAL SECURITY HARDENING
-- Create a function to validate admin access for sensitive operations
CREATE OR REPLACE FUNCTION public.require_admin_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_auth_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
END;
$$;

-- 4. ADD FUNCTION TO LOG CRITICAL SECURITY EVENTS
CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type TEXT,
  user_id UUID,
  details JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_logs (event_type, user_id, details, created_at)
  VALUES (event_type, user_id, details, now());
  
  -- Also create notification for admins
  INSERT INTO notifications (user_id, message, type, created_at)
  SELECT 
    p.id,
    'SECURITY ALERT: ' || event_type || ' detected',
    'security_alert',
    now()
  FROM profiles p 
  WHERE p.role = 'admin';
END;
$$;