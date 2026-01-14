-- RLS Security Fix: Restrict public access to sensitive tables
-- This migration addresses 3 security findings

-- 1. Fix subscription_plans - restrict to authenticated users only
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;

-- Create authenticated-only policy
CREATE POLICY "authenticated_view_subscription_plans" 
ON public.subscription_plans 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Fix referral_codes - restrict to authenticated users only
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.referral_codes;

-- Create authenticated-only policy for viewing active codes
CREATE POLICY "authenticated_view_referral_codes" 
ON public.referral_codes 
FOR SELECT 
USING (auth.role() = 'authenticated' AND active = true);

-- 3. Fix credit_discrepancies view access
-- Note: credit_discrepancies is a VIEW, not a table, so it inherits RLS from underlying tables
-- The view queries student_subscriptions and class_credits_ledger
-- We already have RLS on student_subscriptions, but let's ensure it's admin-only for this sensitive data

-- First, ensure class_credits_ledger has proper RLS for the view
-- Drop any existing permissive policies
DROP POLICY IF EXISTS "admin_view_all_credits" ON public.class_credits_ledger;

-- Add admin-only SELECT policy for credit ledger (needed for credit_discrepancies view)
CREATE POLICY "admin_or_own_credits_ledger" 
ON public.class_credits_ledger 
FOR SELECT 
USING (
  auth.role() = 'authenticated' 
  AND (
    get_auth_user_role() = 'admin' 
    OR student_id = auth.uid()
  )
);

-- Add documentation comments
COMMENT ON POLICY "authenticated_view_subscription_plans" ON public.subscription_plans IS 'Restricts plan viewing to authenticated users only';
COMMENT ON POLICY "authenticated_view_referral_codes" ON public.referral_codes IS 'Restricts referral code viewing to authenticated users only';
COMMENT ON POLICY "admin_or_own_credits_ledger" ON public.class_credits_ledger IS 'Admins see all credits, students see only their own';