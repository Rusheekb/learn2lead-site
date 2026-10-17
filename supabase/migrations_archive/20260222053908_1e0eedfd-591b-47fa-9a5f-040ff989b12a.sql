
-- Insert new credit pack tiers
INSERT INTO subscription_plans (name, classes_per_month, monthly_price, price_per_class, stripe_price_id, stripe_product_id, description, features, active)
VALUES 
  ('1 Credit Pack', 1, 40, 40, 'price_1T3VMD14Kl9WjCfljetZW63c', 'prod_U1YTMikMhQW5O2', 'Try a single class', ARRAY['1 tutoring credit', 'Use at your own pace', 'No expiration date', 'Access to all subjects'], true),
  ('2 Credit Pack', 2, 76, 38, 'price_1T3VME14Kl9WjCflQY8WEY97', 'prod_U1YTeTKQvxlWZQ', 'Perfect for getting started', ARRAY['2 tutoring credits', 'Use at your own pace', 'No expiration date', 'Access to all subjects'], true),
  ('10 Credit Pack', 10, 280, 28, 'price_1T3VMF14Kl9WjCfl0q3uc13H', 'prod_U1YTrBgRSxCmc8', 'Best value for dedicated students', ARRAY['10 tutoring credits', 'Use at your own pace', 'No expiration date', 'Access to all subjects', 'Priority scheduling', 'Personalized study plan'], true);

-- Deactivate the old 12-credit pack
UPDATE subscription_plans SET active = false WHERE stripe_price_id = 'price_1T20M914Kl9WjCfl608OYEiB';
