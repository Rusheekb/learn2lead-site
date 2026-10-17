-- Referrer rewards were previously reported in dollars (COUNT(*) * 25.00),
-- matching the old Stripe-customer-balance reward mechanism. That mechanism
-- never actually worked (customer balance only applies to Invoices, and this
-- app only creates one-time payment Checkout Sessions), so it's being
-- replaced with bonus hours credited directly through class_credits_ledger.
-- This stats function needs to report hours earned instead of a dollar
-- total that was never real. The bonus-hours-per-referral value here (1)
-- must stay in sync with REFERRAL_BONUS_HOURS in stripe-webhooks/index.ts.
DROP FUNCTION IF EXISTS public.get_referral_usage_stats(uuid);

CREATE FUNCTION public.get_referral_usage_stats(p_user_id uuid)
RETURNS TABLE(times_used bigint, hours_earned numeric, latest_usage timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) as times_used,
    COUNT(*) * 1.0 as hours_earned,
    MAX(ru.used_at) as latest_usage
  FROM referral_usage ru
  JOIN referral_codes rc ON rc.id = ru.referral_code_id
  WHERE rc.created_by = p_user_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_referral_usage_stats(uuid) TO PUBLIC;
