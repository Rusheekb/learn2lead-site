-- Phase 1-2: Create function to get student credit balance from ledger
CREATE OR REPLACE FUNCTION public.get_student_credit_balance(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Get the most recent balance from the ledger (single source of truth)
  SELECT balance_after INTO v_balance
  FROM class_credits_ledger
  WHERE student_id = p_student_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Return 0 if no ledger entries exist
  RETURN COALESCE(v_balance, 0);
END;
$$;

-- Phase 3: Create function and trigger to auto-sync subscription credits with ledger
CREATE OR REPLACE FUNCTION public.sync_subscription_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the subscription record with the new balance from ledger
  UPDATE student_subscriptions
  SET credits_remaining = NEW.balance_after,
      updated_at = now()
  WHERE student_id = NEW.student_id
    AND id = NEW.subscription_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_credits_after_ledger_insert
AFTER INSERT ON class_credits_ledger
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_credits();

-- Phase 4: One-time sync script to fix existing inconsistencies
UPDATE student_subscriptions ss
SET credits_remaining = COALESCE((
  SELECT balance_after
  FROM class_credits_ledger
  WHERE student_id = ss.student_id
    AND subscription_id = ss.id
  ORDER BY created_at DESC
  LIMIT 1
), 0),
updated_at = now()
WHERE status IN ('active', 'trialing');

-- Phase 7: Create audit view to detect future discrepancies
CREATE OR REPLACE VIEW public.credit_discrepancies AS
SELECT 
  ss.student_id,
  ss.id as subscription_id,
  ss.credits_remaining as subscription_credits,
  COALESCE((
    SELECT balance_after 
    FROM class_credits_ledger 
    WHERE student_id = ss.student_id 
      AND subscription_id = ss.id
    ORDER BY created_at DESC 
    LIMIT 1
  ), 0) as ledger_credits,
  ss.credits_remaining - COALESCE((
    SELECT balance_after 
    FROM class_credits_ledger 
    WHERE student_id = ss.student_id 
      AND subscription_id = ss.id
    ORDER BY created_at DESC 
    LIMIT 1
  ), 0) as difference
FROM student_subscriptions ss
WHERE ss.status IN ('active', 'trialing')
  AND ss.credits_remaining != COALESCE((
    SELECT balance_after 
    FROM class_credits_ledger 
    WHERE student_id = ss.student_id 
      AND subscription_id = ss.id
    ORDER BY created_at DESC 
    LIMIT 1
  ), 0);