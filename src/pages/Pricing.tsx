import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STRIPE_PRICE_IDS, STRIPE_PLAN_CONFIG, type StripePlanKey } from '@/config/stripe';

type PricingTierProps = {
  name: string;
  price: string;
  total: string;
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
  total,
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
        <span className="text-4xl font-bold">{total}</span>
      </div>
      <div className="mb-1">
        <p className="text-sm text-muted-foreground">{price}</p>
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

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async (priceId: string) => {
    if (!user || !session) {
      navigate('/login?returnUrl=/pricing');
      return;
    }

    setIsLoading(true);
    try {
      const refCode = searchParams.get('ref');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId,
          referralCode: refCode ? refCode.toUpperCase() : undefined 
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
            Credit Packs
          </h2>
          <p className="text-xl text-gray-600">
            Buy credits and use them at your own pace — no subscriptions, no commitments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingTier
            name={STRIPE_PLAN_CONFIG.basic.name}
            price={STRIPE_PLAN_CONFIG.basic.pricePerClass}
            total={STRIPE_PLAN_CONFIG.basic.monthlyTotal}
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
            total={STRIPE_PLAN_CONFIG.standard.monthlyTotal}
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
            total={STRIPE_PLAN_CONFIG.premium.monthlyTotal}
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
