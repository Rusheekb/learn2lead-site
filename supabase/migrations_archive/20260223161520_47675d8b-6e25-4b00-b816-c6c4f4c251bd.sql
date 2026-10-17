
-- Drop and recreate function with numeric return type
DROP FUNCTION IF EXISTS public.get_student_credit_balance(uuid);

CREATE FUNCTION public.get_student_credit_balance(p_student_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT balance_after INTO v_balance
  FROM class_credits_ledger
  WHERE student_id = p_student_id
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN COALESCE(v_balance, 0);
END;
$function$;
