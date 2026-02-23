import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Tag, Clock, CalendarCheck, ShieldCheck, Info } from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const SHARED_FEATURES = [
  'Use at your own pace',
  'Hours never expire',
  'Access to all subjects',
  'Flexible scheduling',
];

const HOW_IT_WORKS = [
  {
    icon: ShieldCheck,
    title: 'Choose your hours',
    description: 'Pick the number of tutoring hours that works for your family.',
  },
  {
    icon: CalendarCheck,
    title: 'Schedule anytime',
    description: 'Book sessions at times that fit your calendar.',
  },
  {
    icon: Clock,
    title: 'Hours never expire',
    description: 'Unused hours carry over, so nothing goes to waste.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'What is a credit?',
    answer:
      'Each credit equals one hour of tutoring. A 1.5-hour session uses 1.5 credits, and a 30-minute session uses 0.5 credits.',
  },
  {
    question: 'What if my session is shorter or longer than an hour?',
    answer:
      'Credits are deducted in half-hour increments. A 30-minute session uses 0.5 credits, a 90-minute session uses 1.5 credits, and a 2-hour session uses 2 credits.',
  },
  {
    question: 'Do unused hours expire?',
    answer:
      'No. Your hours carry over indefinitely. Buy now and use them whenever your schedule allows — there\'s no rush.',
  },
  {
    question: 'Can I buy more hours later?',
    answer:
      'Yes! You can top up anytime. Just come back to this page and purchase another pack whenever you need more hours.',
  },
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

  const hourWord = selectedTier.credits === 1 ? 'Hour' : 'Hours';

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
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Buy Tutoring Hours</h2>
          <p className="text-xl text-gray-600">
            Choose how many hours you'd like — no subscriptions, no commitments
          </p>
        </div>

        {/* Pricing card */}
        <div className="max-w-md mx-auto">
          <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              How many hours?
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
                ${selectedTier.perHour.toFixed(2)} per hour
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
                `Buy ${selectedTier.credits} ${hourWord} — $${selectedTier.total}`
              )}
            </Button>
          </div>

          {/* Carryover callout */}
          <div className="mt-4 flex items-start gap-2 rounded-md bg-blue-50 border border-blue-100 px-4 py-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              Unused hours carry over — buy now, use whenever your schedule allows.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto mt-20">
          <h3 className="text-2xl font-semibold text-center mb-10">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-tutoring-teal/10">
                  <step.icon className="h-6 w-6 text-tutoring-teal" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Step {i + 1}</p>
                <h4 className="font-semibold mb-1">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-20">
          <h3 className="text-2xl font-semibold text-center mb-6">Frequently Asked Questions</h3>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
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
