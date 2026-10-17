-- referral_codes only has a SELECT policy for created_by = auth.uid(), so
-- the public /refer/:code landing page (used by logged-out friends clicking
-- a shared referral link — its entire purpose) has been unable to read any
-- code but the viewer's own. Likely a side effect of an earlier hardening
-- pass that removed a too-broad policy exposing stripe_coupon_id and didn't
-- replace it with anything narrower. Fix the same way get_referral_usage_stats
-- already solved this exact class of problem on this table: a SECURITY
-- DEFINER function returning only the fields the public page actually needs,
-- never stripe_coupon_id or raw IDs.
CREATE OR REPLACE FUNCTION public.get_public_referral_code(p_code text)
RETURNS TABLE(
  code text,
  discount_amount numeric,
  discount_type text,
  active boolean,
  expires_at timestamp with time zone,
  max_uses integer,
  times_used integer,
  referrer_first_name text,
  referrer_last_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    rc.code,
    rc.discount_amount,
    rc.discount_type,
    rc.active,
    rc.expires_at,
    rc.max_uses,
    rc.times_used,
    p.first_name,
    p.last_name
  FROM referral_codes rc
  LEFT JOIN profiles p ON p.id = rc.created_by
  WHERE rc.code = upper(p_code);
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_referral_code(text) TO anon, authenticated;
