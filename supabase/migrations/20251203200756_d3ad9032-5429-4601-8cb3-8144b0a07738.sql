-- Add RLS policy for users to view their own referral codes
CREATE POLICY "Users can view their own referral codes"
ON public.referral_codes
FOR SELECT
USING (created_by = auth.uid());

-- Add RLS policy for users to view referral usage where they are the referrer
CREATE POLICY "Referrers can view usage of their codes"
ON public.referral_usage
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.referral_codes rc
    WHERE rc.id = referral_usage.referral_code_id
    AND rc.created_by = auth.uid()
  )
);