
-- Remove the non-negative constraint to allow negative credit balances for overdraw feature
ALTER TABLE student_subscriptions DROP CONSTRAINT IF EXISTS credits_remaining_non_negative;
