import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Loader2, ChevronDown, ChevronUp, Tag, Gift } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { STRIPE_PRICE_IDS, STRIPE_PLAN_PRICES, STRIPE_PLAN_CONFIG, type StripePlanKey } from '@/config/stripe';
type PricingTierProps = {
  name: string;
  price: string;
  monthlyTotal: string;
  discountedTotal?: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
  priceId: string;
  onCheckout: (priceId: string) => void;
  isLoading: boolean;
};

const PricingTier: React.FC<PricingTierProps> = ({
  name,
  price,
  monthlyTotal,
  discountedTotal,
  description,
  features,
  buttonText,
  highlighted = false,
  priceId,
  onCheckout,
  isLoading,
}) => {
  return (
    <div
      className={`flex flex-col p-6 rounded-lg border ${
        highlighted ? 'border-tutoring-teal shadow-lg' : 'border-gray-200'
      }`}
    >
      <h3 className="text-xl font-bold mb-2">{name}</h3>
      <div className="mb-2">
        <span className="text-4xl font-bold">{price}</span>
      </div>
      <div className="mb-1">
        {discountedTotal ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground line-through">{monthlyTotal}</span>
            <span className="text-sm font-semibold text-green-600">{discountedTotal}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{monthlyTotal}</p>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <Button
          className={`w-full ${
            highlighted ? 'bg-tutoring-teal hover:bg-tutoring-teal/90' : ''
          }`}
          onClick={() => onCheckout(priceId)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </div>
    </div>
  );
};

// Price IDs and plan prices are now imported from centralized config
// See src/config/stripe.ts to update when switching to live mode

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [validatedDiscount, setValidatedDiscount] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Check for referral code in URL params on mount
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      setIsReferralOpen(true);
      // Auto-validate the code
      validateReferralCodeFromUrl(refCode.toUpperCase());
    }
  }, [searchParams]);

  const validateReferralCodeFromUrl = async (code: string) => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('discount_amount, active, expires_at, max_uses, times_used')
        .eq('code', code)
        .single();

      if (error || !data) {
        toast.error('Invalid referral code');
        setValidatedDiscount(null);
        return;
      }

      if (!data.active) {
        toast.error('This referral code is no longer active');
        setValidatedDiscount(null);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('This referral code has expired');
        setValidatedDiscount(null);
        return;
      }

      if (data.max_uses && data.times_used >= data.max_uses) {
        toast.error('This referral code has reached its usage limit');
        setValidatedDiscount(null);
        return;
      }

      setValidatedDiscount(data.discount_amount);
      toast.success(`Code applied! $${data.discount_amount} off your first month`);
    } catch (error) {
      console.error('Error validating code:', error);
      setValidatedDiscount(null);
    } finally {
      setIsValidating(false);
    }
  };
  
  const validateReferralCode = async () => {
    if (!referralCode.trim()) {
      setValidatedDiscount(null);
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('discount_amount, active, expires_at, max_uses, times_used')
        .eq('code', referralCode.toUpperCase())
        .single();

      if (error || !data) {
        toast.error('Invalid referral code');
        setValidatedDiscount(null);
        return;
      }

      if (!data.active) {
        toast.error('This referral code is no longer active');
        setValidatedDiscount(null);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('This referral code has expired');
        setValidatedDiscount(null);
        return;
      }

      if (data.max_uses && data.times_used >= data.max_uses) {
        toast.error('This referral code has reached its usage limit');
        setValidatedDiscount(null);
        return;
      }

      setValidatedDiscount(data.discount_amount);
      toast.success(`Code applied! $${data.discount_amount} off your first month`);
    } catch (error) {
      console.error('Error validating code:', error);
      toast.error('Error validating code');
      setValidatedDiscount(null);
    } finally {
      setIsValidating(false);
    }
  };

  const getDiscountedPrice = (planKey: StripePlanKey) => {
    if (!validatedDiscount) return undefined;
    return `$${STRIPE_PLAN_PRICES[planKey] - validatedDiscount}/month (first month)`;
  };

  const handleCheckout = async (priceId: string) => {
    if (!user || !session) {
      navigate('/login?returnUrl=/pricing');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId,
          referralCode: validatedDiscount ? referralCode.toUpperCase() : undefined 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-tutoring-blue">
                Learn<span className="text-tutoring-teal">2</span>Lead
              </h1>
              <span className="ml-2 text-gray-500">Pricing</span>
            </div>
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
              >
                Home
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 focus:outline-none">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that's right for your learning journey
          </p>
        </div>

        {/* Referral Code Section */}
        <div className="max-w-md mx-auto mb-8">
          <Collapsible open={isReferralOpen} onOpenChange={setIsReferralOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Gift className="h-4 w-4" />
                Have a referral code?
                {isReferralOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter code"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase());
                      setValidatedDiscount(null);
                    }}
                    className="pl-10 uppercase"
                  />
                </div>
                <Button 
                  onClick={validateReferralCode}
                  disabled={isValidating || !referralCode.trim()}
                  variant="outline"
                >
                  {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {validatedDiscount && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">${validatedDiscount} off</span> your first month!
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Plus, your friend gets ${validatedDiscount} credit on their next bill.
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingTier
            name={STRIPE_PLAN_CONFIG.basic.name}
            price={STRIPE_PLAN_CONFIG.basic.pricePerClass}
            monthlyTotal={STRIPE_PLAN_CONFIG.basic.monthlyTotal}
            discountedTotal={getDiscountedPrice('basic')}
            description={STRIPE_PLAN_CONFIG.basic.description}
            features={[...STRIPE_PLAN_CONFIG.basic.features]}
            buttonText={STRIPE_PLAN_CONFIG.basic.buttonText}
            highlighted={STRIPE_PLAN_CONFIG.basic.highlighted}
            priceId={STRIPE_PRICE_IDS.basic}
            onCheckout={handleCheckout}
            isLoading={isLoading}
          />

          <PricingTier
            name={STRIPE_PLAN_CONFIG.standard.name}
            price={STRIPE_PLAN_CONFIG.standard.pricePerClass}
            monthlyTotal={STRIPE_PLAN_CONFIG.standard.monthlyTotal}
            discountedTotal={getDiscountedPrice('standard')}
            description={STRIPE_PLAN_CONFIG.standard.description}
            features={[...STRIPE_PLAN_CONFIG.standard.features]}
            buttonText={STRIPE_PLAN_CONFIG.standard.buttonText}
            highlighted={STRIPE_PLAN_CONFIG.standard.highlighted}
            priceId={STRIPE_PRICE_IDS.standard}
            onCheckout={handleCheckout}
            isLoading={isLoading}
          />

          <PricingTier
            name={STRIPE_PLAN_CONFIG.premium.name}
            price={STRIPE_PLAN_CONFIG.premium.pricePerClass}
            monthlyTotal={STRIPE_PLAN_CONFIG.premium.monthlyTotal}
            discountedTotal={getDiscountedPrice('premium')}
            description={STRIPE_PLAN_CONFIG.premium.description}
            features={[...STRIPE_PLAN_CONFIG.premium.features]}
            buttonText={STRIPE_PLAN_CONFIG.premium.buttonText}
            highlighted={STRIPE_PLAN_CONFIG.premium.highlighted}
            priceId={STRIPE_PRICE_IDS.premium}
            onCheckout={handleCheckout}
            isLoading={isLoading}
          />
        </div>

        <div className="max-w-3xl mx-auto text-center mt-16">
          <h3 className="text-2xl font-semibold mb-4">
            Need something different?
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            We also offer customized plans for schools and organizations
          </p>
          <Button size="lg">Contact Us</Button>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
