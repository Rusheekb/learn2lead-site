
-- Test: Deduct 18 credits from bar@gmail.com to create -6 balance for overdraw testing
INSERT INTO class_credits_ledger (
  student_id,
  subscription_id,
  amount,
  balance_after,
  transaction_type,
  reason
) VALUES (
  '90050b58-fc48-4c48-974b-e8bb0cd13e28',
  '1a9f7250-a8c6-48c7-acea-644cab0f3f8f',
  -18,
  -6,
  'debit',
  'Test deduction for overdraw reminder testing'
);
