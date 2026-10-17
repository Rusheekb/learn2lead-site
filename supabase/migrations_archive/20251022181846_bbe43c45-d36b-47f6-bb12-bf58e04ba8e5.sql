-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stripe_price_id text UNIQUE NOT NULL,
  stripe_product_id text UNIQUE NOT NULL,
  monthly_price numeric NOT NULL,
  classes_per_month integer NOT NULL,
  price_per_class numeric NOT NULL,
  description text,
  features text[],
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create student subscriptions table
CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.subscription_plans(id),
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'incomplete')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  credits_remaining integer NOT NULL DEFAULT 0,
  credits_allocated integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create class credits ledger for audit trail
CREATE TABLE IF NOT EXISTS public.class_credits_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.student_subscriptions(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund', 'adjustment')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  related_class_id text,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add verified_by_student flag to class_logs for dispute prevention
ALTER TABLE public.class_logs 
ADD COLUMN IF NOT EXISTS verified_by_student boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_deadline timestamptz,
ADD COLUMN IF NOT EXISTS disputed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dispute_reason text;

-- Insert the three subscription plans we just created in Stripe
INSERT INTO public.subscription_plans (name, stripe_price_id, stripe_product_id, monthly_price, classes_per_month, price_per_class, description, features)
VALUES 
  ('Basic Plan', 'price_1SL6a21fzLklBERMSslJBHZr', 'prod_THfv60HaedbqwG', 140, 4, 35, 'Perfect for students needing regular weekly tutoring sessions', ARRAY['4 classes per month', '$35 per class', 'All subjects available', 'Flexible scheduling']),
  ('Standard Plan', 'price_1SL6aZ1fzLklBERMrn7hS8ua', 'prod_THfwMX8OX6X02s', 240, 8, 30, 'Ideal for students needing bi-weekly tutoring support', ARRAY['8 classes per month', '$30 per class', 'All subjects available', 'Priority scheduling', 'Save $40/month']),
  ('Premium Plan', 'price_1SL6as1fzLklBERMpT5U2zj3', 'prod_THfw8XE4puivbX', 300, 12, 25, 'Best value for intensive tutoring with 3 classes per week', ARRAY['12 classes per month', '$25 per class', 'All subjects available', 'Priority scheduling', 'Save $120/month', 'Dedicated tutor support'])
ON CONFLICT (stripe_price_id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_credits_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read, admin write)
CREATE POLICY "Anyone can view subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (get_auth_user_role() = 'admin');

-- RLS Policies for student_subscriptions
CREATE POLICY "Students can view their own subscriptions"
  ON public.student_subscriptions FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON public.student_subscriptions FOR SELECT
  USING (get_auth_user_role() = 'admin');

CREATE POLICY "Admins can manage all subscriptions"
  ON public.student_subscriptions FOR ALL
  USING (get_auth_user_role() = 'admin');

CREATE POLICY "Tutors can view their students' subscription status"
  ON public.student_subscriptions FOR SELECT
  USING (
    get_auth_user_role() = 'tutor' 
    AND EXISTS (
      SELECT 1 FROM public.tutor_student_assigned tsa
      WHERE tsa.tutor_id = auth.uid() 
      AND tsa.student_id = student_subscriptions.student_id
      AND tsa.active = true
    )
  );

-- RLS Policies for class_credits_ledger
CREATE POLICY "Students can view their own credit history"
  ON public.class_credits_ledger FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all credit history"
  ON public.class_credits_ledger FOR SELECT
  USING (get_auth_user_role() = 'admin');

CREATE POLICY "Admins can manage credit history"
  ON public.class_credits_ledger FOR ALL
  USING (get_auth_user_role() = 'admin');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student_id ON public.student_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status ON public.student_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_class_credits_ledger_student_id ON public.class_credits_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_class_credits_ledger_subscription_id ON public.class_credits_ledger(subscription_id);

-- Create updated_at trigger for student_subscriptions
CREATE OR REPLACE FUNCTION update_student_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_subscriptions_updated_at
  BEFORE UPDATE ON public.student_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_student_subscriptions_updated_at();