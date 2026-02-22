import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Tag } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CREDIT_TIERS, DEFAULT_TIER_INDEX } from '@/config/stripe';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SHARED_FEATURES = [
  'Use at your own pace',
  'No expiration date',
  'Access to all subjects',
  'Flexible scheduling',
];

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(DEFAULT_TIER_INDEX);

  const selectedTier = CREDIT_TIERS[selectedIndex];

  const handleCheckout = async () => {
    if (!user || !session) {
      navigate('/login?returnUrl=/pricing');
      return;
    }

    setIsLoading(true);
    try {
      const refCode = searchParams.get('ref');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: selectedTier.priceId,
          referralCode: refCode ? refCode.toUpperCase() : undefined,
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
              <Button variant="ghost" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 focus:outline-none"
      >
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Buy Credits</h2>
          <p className="text-xl text-gray-600">
            Pick how many credits you need — no subscriptions, no commitments
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
            {/* Credit selector */}
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              How many credits?
            </label>
            <Select
              value={String(selectedIndex)}
              onValueChange={(v) => setSelectedIndex(Number(v))}
            >
              <SelectTrigger className="w-full text-base h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {CREDIT_TIERS.map((tier, i) => (
                  <SelectItem key={tier.credits} value={String(i)}>
                    <span className="flex items-center gap-2">
                      {tier.label} — ${tier.total}
                      {tier.savingsPercent > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          Save {tier.savingsPercent}%
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Price display */}
            <div className="mt-6 text-center">
              <div className="text-5xl font-bold text-foreground">
                ${selectedTier.total}
              </div>
              <p className="text-muted-foreground mt-1">
                ${selectedTier.perClass.toFixed(2)} per class
              </p>
              {selectedTier.savingsPercent > 0 && (
                <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  <Tag className="h-3.5 w-3.5" />
                  You save ${(40 * selectedTier.credits - selectedTier.total).toFixed(0)} vs buying individually
                </div>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-3 mt-6 mb-8">
              {SHARED_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
              {selectedTier.credits >= 8 && (
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">Priority scheduling</span>
                </li>
              )}
              {selectedTier.credits >= 10 && (
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">Personalized study plan</span>
                </li>
              )}
            </ul>

            {/* Checkout button */}
            <Button
              className="w-full h-12 text-base bg-tutoring-teal hover:bg-tutoring-teal/90"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Buy ${selectedTier.credits} Credit${selectedTier.credits > 1 ? 's' : ''} — $${selectedTier.total}`
              )}
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center mt-16">
          <h3 className="text-2xl font-semibold mb-4">Need something different?</h3>
          <p className="text-lg text-gray-600 mb-6">
            We also offer customized plans for schools and organizations
          </p>
          <Button size="lg" onClick={() => navigate('/?section=contact')}>
            Contact Us
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
