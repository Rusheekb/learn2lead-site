-- Create referral_codes table
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_amount NUMERIC NOT NULL DEFAULT 25.00,
  stripe_coupon_id TEXT NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  times_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID REFERENCES public.profiles(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_usage table
CREATE TABLE public.referral_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id),
  used_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  used_by_email TEXT NOT NULL,
  subscription_id TEXT,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent same email using multiple referral codes
CREATE UNIQUE INDEX referral_usage_email_unique ON public.referral_usage(used_by_email);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_codes
CREATE POLICY "Anyone can view active referral codes" 
ON public.referral_codes 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admins can manage referral codes" 
ON public.referral_codes 
FOR ALL 
USING (get_auth_user_role() = 'admin');

-- RLS policies for referral_usage
CREATE POLICY "Admins can view all referral usage" 
ON public.referral_usage 
FOR SELECT 
USING (get_auth_user_role() = 'admin');

CREATE POLICY "Users can view their own referral usage" 
ON public.referral_usage 
FOR SELECT 
USING (used_by_user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_referral_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_referral_codes_updated_at
BEFORE UPDATE ON public.referral_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_referral_codes_updated_at();