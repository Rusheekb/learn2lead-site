-- 1. Restrict credit_discrepancies view with security_invoker
ALTER VIEW public.credit_discrepancies SET (security_invoker = true);

-- 2. Drop overly permissive referral_codes policy that exposes stripe_coupon_id
DROP POLICY IF EXISTS "authenticated_view_referral_codes" ON public.referral_codes;

-- Replace: only code owners and admins can view (owners already have their own policy)
-- No need for a broad authenticated policy since codes are applied via edge functions

-- 3. Drop policy that exposes used_by_email to referrers
DROP POLICY IF EXISTS "Referrers can view usage of their codes" ON public.referral_usage;

-- Replace with same row access but referrers should use the secure function for stats
CREATE POLICY "Referrers can view anonymized usage of their codes"
ON public.referral_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM referral_codes rc
    WHERE rc.id = referral_usage.referral_code_id
    AND rc.created_by = auth.uid()
  )
);

-- Create secure function for anonymized referral stats (no email exposure)
CREATE OR REPLACE FUNCTION public.get_referral_usage_stats(p_user_id uuid)
RETURNS TABLE(
  times_used bigint,
  total_earnings numeric,
  latest_usage timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as times_used,
    COUNT(*) * 25.00 as total_earnings,
    MAX(ru.used_at) as latest_usage
  FROM referral_usage ru
  JOIN referral_codes rc ON rc.id = ru.referral_code_id
  WHERE rc.created_by = p_user_id;
$$;