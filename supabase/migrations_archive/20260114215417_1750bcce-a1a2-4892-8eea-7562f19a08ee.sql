-- Update subscription_plans with live Stripe product and price IDs
UPDATE public.subscription_plans
SET 
  stripe_product_id = 'prod_TnBdJ7GQnLLpSv',
  stripe_price_id = 'price_1SpbGd1fzLklBERMn8JbKczH'
WHERE name = 'Basic Plan';

UPDATE public.subscription_plans
SET 
  stripe_product_id = 'prod_TnBe7SCgcDrrid',
  stripe_price_id = 'price_1SpbGq1fzLklBERM8W5mMeOx'
WHERE name = 'Standard Plan';

UPDATE public.subscription_plans
SET 
  stripe_product_id = 'prod_TnBgoXhcHfXZ2e',
  stripe_price_id = 'price_1SpbIv1fzLklBERMHinrOG9F'
WHERE name = 'Premium Plan';