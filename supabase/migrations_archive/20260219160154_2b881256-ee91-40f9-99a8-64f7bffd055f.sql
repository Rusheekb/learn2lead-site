
-- Create auto_renewal_settings table
CREATE TABLE public.auto_renewal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  renewal_pack text NOT NULL DEFAULT 'standard',
  threshold integer NOT NULL DEFAULT 1,
  stripe_customer_id text,
  last_renewal_at timestamptz,
  last_renewal_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auto_renewal_settings_student_unique UNIQUE (student_id),
  CONSTRAINT auto_renewal_settings_pack_check CHECK (renewal_pack IN ('basic', 'standard', 'premium')),
  CONSTRAINT auto_renewal_settings_threshold_check CHECK (threshold >= 1 AND threshold <= 10)
);

-- Enable RLS
ALTER TABLE public.auto_renewal_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can view their own auto-renewal settings"
ON public.auto_renewal_settings FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own auto-renewal settings"
ON public.auto_renewal_settings FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own auto-renewal settings"
ON public.auto_renewal_settings FOR UPDATE
USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all auto-renewal settings"
ON public.auto_renewal_settings FOR ALL
USING (get_auth_user_role() = 'admin');

-- Updated_at trigger
CREATE TRIGGER update_auto_renewal_settings_updated_at
BEFORE UPDATE ON public.auto_renewal_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_student_subscriptions_updated_at();
