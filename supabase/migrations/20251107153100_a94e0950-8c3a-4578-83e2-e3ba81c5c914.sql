-- Fix security definer view warning by recreating without SECURITY DEFINER
-- The view doesn't need SECURITY DEFINER since it only reads from tables
-- that already have proper RLS policies
DROP VIEW IF EXISTS public.credit_discrepancies;

CREATE VIEW public.credit_discrepancies 
WITH (security_invoker = true)
AS
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