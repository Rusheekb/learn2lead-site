import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Check,
  Loader2,
  Sparkles,
  Clock,
  CalendarCheck,
  ShieldCheck,
  Info,
  Lock,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CREDIT_TIERS, DEFAULT_TIER_INDEX } from '@/config/stripe';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

const log = logger.create('Pricing');

const SHARED_FEATURES = [
  'Use at your own pace',
  'Hours never expire',
  'Access to all subjects',
  'Flexible scheduling',
];

// Display names matching the tier naming already used elsewhere in the app
// (subscription_plans, auto-renewal pack options).
const TIER_NAMES = ['Basic', 'Standard', 'Premium'];

const HOW_IT_WORKS = [
  {
    icon: ShieldCheck,
    title: 'Choose your hours',
    description:
      'Pick the number of tutoring hours that works for your family.',
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
      "No. Your hours carry over indefinitely. Buy now and use them whenever your schedule allows — there's no rush.",
  },
  {
    question: 'Can I buy more hours later?',
    answer:
      'Yes! You can top up anytime. Just come back to this page and purchase another pack whenever you need more hours.',
  },
];

// Persisted (not sessionStorage) so intent survives a signup's email-verification
// step, which very often opens in a new tab with no shared query-param context.
const PENDING_INTENT_KEY = 'l2l_pending_purchase_intent';
const PENDING_INTENT_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session } = useAuth();
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [welcomeBackIndex, setWelcomeBackIndex] = useState<number | null>(null);

  // Arrived here after finishing login/signup with a pending purchase intent —
  // make it unmistakable what to do next instead of leaving them to guess.
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(PENDING_INTENT_KEY);
      if (!raw) return;
      const intent = JSON.parse(raw) as { tierIndex: number; ts: number };
      localStorage.removeItem(PENDING_INTENT_KEY);
      if (Date.now() - intent.ts > PENDING_INTENT_MAX_AGE_MS) return;
      if (intent.tierIndex < 0 || intent.tierIndex >= CREDIT_TIERS.length)
        return;
      setWelcomeBackIndex(intent.tierIndex);
      toast.success(
        "You're all set — pick a pack below to finish your purchase."
      );
    } catch {
      // Corrupt/unexpected localStorage value — ignore
    }
  }, [user]);

  const handleCheckout = async (index: number) => {
    const tier = CREDIT_TIERS[index];

    if (!user || !session) {
      try {
        localStorage.setItem(
          PENDING_INTENT_KEY,
          JSON.stringify({ tierIndex: index, ts: Date.now() })
        );
      } catch {
        // localStorage unavailable (private browsing, etc) — returnUrl below still works
      }
      navigate('/login?returnUrl=/pricing');
      return;
    }

    if (tier.priceId.startsWith('MISSING_')) {
      toast.error(
        "This pack isn't available yet — please choose a different one."
      );
      return;
    }

    setLoadingIndex(index);
    try {
      const refCode = searchParams.get('ref');
      const { data, error } = await supabase.functions.invoke(
        'create-checkout',
        {
          body: {
            priceId: tier.priceId,
            referralCode: refCode ? refCode.toUpperCase() : undefined,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      log.error('Checkout error:', error);
      toast.error(
        error.message || 'Failed to start checkout. Please try again.'
      );
      setLoadingIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
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
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 focus:outline-none"
      >
        {/* Hero */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-lg text-gray-500">
            Buy tutoring hours once, use them whenever you like — no
            subscriptions, no commitments.
          </p>
        </div>

        {welcomeBackIndex !== null && (
          <div className="max-w-5xl mx-auto mb-6 flex items-center gap-2.5 rounded-xl border border-tutoring-teal/30 bg-tutoring-teal/5 px-5 py-3.5">
            <Sparkles className="h-4.5 w-4.5 text-tutoring-teal shrink-0" />
            <p className="text-sm text-gray-800">
              You're signed in! Pick{' '}
              <strong>{CREDIT_TIERS[welcomeBackIndex]?.label}</strong> below
              (highlighted) to pick up where you left off, or choose a different
              pack.
            </p>
          </div>
        )}

        {/* Pricing cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {CREDIT_TIERS.map((tier, i) => {
            const isFeatured = i === DEFAULT_TIER_INDEX;
            const isWelcomeBackPick = i === welcomeBackIndex;
            const isLoading = loadingIndex === i;
            const anyLoading = loadingIndex !== null;

            return (
              <div
                key={tier.credits}
                className={cn(
                  'relative flex flex-col rounded-2xl bg-white p-8 transition-shadow',
                  isWelcomeBackPick
                    ? 'border-2 border-tutoring-blue shadow-xl ring-4 ring-tutoring-blue/15'
                    : isFeatured
                      ? 'border-2 border-tutoring-teal shadow-xl'
                      : 'border border-gray-200 shadow-sm hover:shadow-md'
                )}
              >
                {isWelcomeBackPick && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-tutoring-blue px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      Your Pick
                    </span>
                  </div>
                )}

                {isFeatured && !isWelcomeBackPick && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-tutoring-teal px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-tutoring-blue">
                  {TIER_NAMES[i] ?? tier.label}
                </div>
                <div className="text-sm text-gray-500 mb-6">
                  {tier.label} of tutoring
                </div>

                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight text-gray-900">
                    ${tier.total}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  ${tier.perHour.toFixed(2)} per hour
                </p>

                {tier.savingsPercent > 0 ? (
                  <div className="inline-flex w-fit items-center gap-1 mb-6 px-3 py-1 rounded-full bg-tutoring-lightBlue text-tutoring-blue text-xs font-semibold">
                    Save {tier.savingsPercent}% vs Basic
                  </div>
                ) : (
                  <div className="mb-6 h-[26px]" aria-hidden="true" />
                )}

                <div className="border-t border-gray-100 pt-6 mb-8 flex-1">
                  <ul className="space-y-3">
                    {SHARED_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="h-4.5 w-4.5 text-tutoring-teal shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                    {tier.credits >= 8 && (
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4.5 w-4.5 text-tutoring-teal shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">
                          Priority scheduling
                        </span>
                      </li>
                    )}
                    {tier.credits >= 12 && (
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4.5 w-4.5 text-tutoring-teal shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">
                          Personalized study plan
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <Button
                  className={cn(
                    'w-full h-12 text-base font-medium',
                    isFeatured
                      ? 'bg-tutoring-teal hover:bg-tutoring-teal/90'
                      : 'bg-tutoring-blue hover:bg-tutoring-blue/90'
                  )}
                  onClick={() => handleCheckout(i)}
                  disabled={anyLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting…
                    </>
                  ) : (
                    `Buy ${tier.label}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Trust + carryover strip */}
        <div className="max-w-5xl mx-auto mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-tutoring-lightBlue/60 border border-tutoring-lightBlue px-5 py-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-tutoring-blue shrink-0" />
            <p className="text-sm text-tutoring-blue">
              Unused hours carry over — buy now, use whenever your schedule
              allows.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
            <Lock className="h-3.5 w-3.5" />
            Secure checkout powered by Stripe
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto mt-24">
          <h3 className="text-2xl font-semibold text-center mb-10">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-tutoring-teal/10">
                  <step.icon className="h-6 w-6 text-tutoring-teal" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Step {i + 1}
                </p>
                <h4 className="font-semibold mb-1">{step.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-24">
          <h3 className="text-2xl font-semibold text-center mb-6">
            Frequently Asked Questions
          </h3>
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
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h3 className="text-2xl font-semibold mb-4">
            Need something different?
          </h3>
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
