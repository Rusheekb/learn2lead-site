-- Add non-negative constraint to credits_remaining to prevent race conditions
ALTER TABLE student_subscriptions
ADD CONSTRAINT credits_remaining_non_negative 
CHECK (credits_remaining >= 0);

-- Add helpful comment
COMMENT ON CONSTRAINT credits_remaining_non_negative ON student_subscriptions 
IS 'Prevents negative credit balances from race conditions during class completion';