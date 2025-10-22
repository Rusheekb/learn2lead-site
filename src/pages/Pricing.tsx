import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
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
  basic: 'price_1Qg8kcJDlZ7pxe9g1LLc5W1a',
  standard: 'price_1Qg8knJDlZ7pxe9gQJV7oJHJ',
  premium: 'price_1Qg8ktJDlZ7pxe9gE2fMqwcB',
};

const Pricing = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleCheckout = async (priceId: string) => {
    if (!user || !session) {
      navigate('/login?returnUrl=/pricing');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
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
