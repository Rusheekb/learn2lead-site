-- Update subscription_plans with new credit pack names and Stripe IDs
UPDATE subscription_plans SET name = '4 Credit Pack', stripe_price_id = 'price_1T20M714Kl9WjCflVbq3glKt', stripe_product_id = 'prod_U00MlcJgfxfC4z' WHERE id = '8509ee20-24eb-45e3-b702-3336e7c48a59';
UPDATE subscription_plans SET name = '8 Credit Pack', stripe_price_id = 'price_1T20M714Kl9WjCflDIKczcAX', stripe_product_id = 'prod_U00MtAVrgyB7J7' WHERE id = 'a4bf0413-f6bd-48cc-bdbe-d0ff8cc8b5c0';
UPDATE subscription_plans SET name = '12 Credit Pack', stripe_price_id = 'price_1T20M914Kl9WjCfl608OYEiB', stripe_product_id = 'prod_U00MCJrsH1M2KJ' WHERE id = '0a165a68-69b2-4318-aa74-ca843a9398e6';
