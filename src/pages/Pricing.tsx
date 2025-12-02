import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PricingTierProps = {
  name: string;
  price: string;
  monthlyTotal: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
  priceId: string;
  onCheckout: (priceId: string) => void;
  isLoading: boolean;
  discount?: number;
};

const PricingTier: React.FC<PricingTierProps> = ({
  name,
  price,
  monthlyTotal,
  description,
  features,
  buttonText,
  highlighted = false,
  priceId,
  onCheckout,
  isLoading,
  discount,
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
      <p className="text-sm text-muted-foreground mb-1">{monthlyTotal}</p>
      {discount && (
        <p className="text-sm text-green-600 font-medium mb-1">
          First month: ${(parseFloat(monthlyTotal.replace(/[^0-9.]/g, '')) - discount).toFixed(0)} (Save ${discount}!)
        </p>
      )}
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

const PRICE_IDS = {
  basic: 'price_1SL6a21fzLklBERMSslJBHZr',    // $140/month - Basic Plan (4 classes)
  standard: 'price_1SL6aZ1fzLklBERMrn7hS8ua', // $240/month - Standard Plan (8 classes)
  premium: 'price_1SL6as1fzLklBERMpT5U2zj3',  // $300/month - Premium Plan (12 classes)
};

const Pricing = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [validatedDiscount, setValidatedDiscount] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const validateReferralCode = async () => {
    if (!referralCode.trim()) {
      setValidatedDiscount(null);
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('discount_amount, expires_at, max_uses, times_used')
        .eq('code', referralCode.toUpperCase().trim())
        .eq('active', true)
        .maybeSingle();

      if (error || !data) {
        toast.error('Invalid referral code');
        setValidatedDiscount(null);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('This referral code has expired');
        setValidatedDiscount(null);
        return;
      }

      if (data.max_uses !== null && data.times_used >= data.max_uses) {
        toast.error('This referral code has reached its maximum uses');
        setValidatedDiscount(null);
        return;
      }

      setValidatedDiscount(Number(data.discount_amount));
      toast.success(`Referral code applied! $${data.discount_amount} off your first month`);
    } catch (error) {
      console.error('Error validating referral code:', error);
      toast.error('Failed to validate referral code');
      setValidatedDiscount(null);
    } finally {
      setIsValidating(false);
    }
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
          referralCode: validatedDiscount ? referralCode.toUpperCase().trim() : undefined
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const message = error instanceof Error ? error.message : 'Failed to start checkout';
      toast.error(message);
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that's right for your learning journey
          </p>
        </div>

        {/* Referral Code Section */}
        <div className="max-w-md mx-auto mb-10">
          <button
            onClick={() => setShowReferral(!showReferral)}
            className="flex items-center justify-center w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Tag className="h-4 w-4 mr-2" />
            Have a referral code?
            {showReferral ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </button>
          
          {showReferral && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    setValidatedDiscount(null);
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={validateReferralCode}
                  disabled={isValidating || !referralCode.trim()}
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
              {validatedDiscount && (
                <p className="mt-2 text-sm text-green-600 flex items-center">
                  <Check className="h-4 w-4 mr-1" />
                  ${validatedDiscount} discount will be applied to your first month!
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingTier
            name="Basic"
            price="$35/class"
            monthlyTotal="$140/month"
            description="Perfect for beginners looking to improve in one subject"
            features={[
              'Access to one subject area',
              '4 classes per month',
              'Basic study materials',
              'Email support',
            ]}
            buttonText="Get Started"
            priceId={PRICE_IDS.basic}
            onCheckout={handleCheckout}
            isLoading={isLoading}
            discount={validatedDiscount || undefined}
          />

          <PricingTier
            name="Standard"
            price="$30/class"
            monthlyTotal="$240/month"
            description="Our most popular plan for dedicated students"
            features={[
              'Access to all subject areas',
              '8 classes per month',
              'Advanced study materials',
              'Practice tests and assessments',
              'Priority email support',
            ]}
            buttonText="Choose Standard"
            highlighted={true}
            priceId={PRICE_IDS.standard}
            onCheckout={handleCheckout}
            isLoading={isLoading}
            discount={validatedDiscount || undefined}
          />

          <PricingTier
            name="Premium"
            price="$25/class"
            monthlyTotal="$300/month"
            description="Comprehensive support for academic excellence"
            features={[
              'Access to all subject areas',
              '12 classes per month',
              'Premium study materials',
              'Personalized study plan',
              'Practice tests and assessments',
              '1-on-1 counseling sessions',
              '24/7 priority support',
            ]}
            buttonText="Choose Premium"
            priceId={PRICE_IDS.premium}
            onCheckout={handleCheckout}
            isLoading={isLoading}
            discount={validatedDiscount || undefined}
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
