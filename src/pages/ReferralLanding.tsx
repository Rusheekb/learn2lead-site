import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Check, Gift, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReferralCodeData {
  code: string;
  discountAmount: number;
  referrerName: string;
}

const ReferralLanding: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [referralData, setReferralData] = useState<ReferralCodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!code) {
        setError('No referral code provided');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the referral code and referrer info
        const { data, error: fetchError } = await supabase
          .from('referral_codes')
          .select(`
            code,
            discount_amount,
            active,
            expires_at,
            max_uses,
            times_used,
            created_by
          `)
          .eq('code', code.toUpperCase())
          .single();

        if (fetchError || !data) {
          setError('Invalid or expired referral code');
          setIsLoading(false);
          return;
        }

        // Validate the code is still usable
        if (!data.active) {
          setError('This referral code is no longer active');
          setIsLoading(false);
          return;
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('This referral code has expired');
          setIsLoading(false);
          return;
        }

        if (data.max_uses && data.times_used >= data.max_uses) {
          setError('This referral code has reached its usage limit');
          setIsLoading(false);
          return;
        }

        // Fetch referrer's name
        let referrerName = 'A friend';
        if (data.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', data.created_by)
            .single();

          if (profile?.first_name) {
            referrerName = profile.first_name;
            if (profile.last_name) {
              referrerName += ` ${profile.last_name.charAt(0)}.`;
            }
          }
        }

        setReferralData({
          code: data.code,
          discountAmount: Number(data.discount_amount),
          referrerName,
        });
      } catch (err) {
        console.error('Error fetching referral data:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferralData();
  }, [code]);

  const handleGetStarted = () => {
    // Navigate to pricing with the code pre-filled
    navigate(`/pricing?ref=${code?.toUpperCase()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">{error}</h1>
            <p className="text-muted-foreground">
              The referral code may be invalid, expired, or no longer available.
            </p>
            <Button onClick={() => navigate('/pricing')} className="w-full">
              View Our Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">
            Learn<span className="text-foreground">2</span>Lead
          </h1>
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full text-center space-y-8"
        >
          {/* Referrer Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Gift className="h-4 w-4" />
            {referralData?.referrerName} invited you
          </div>

          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Get{' '}
              <span className="text-primary">
                ${referralData?.discountAmount || 25} off
              </span>{' '}
              your first month
            </h1>
            <p className="text-lg text-muted-foreground">
              Expert 1-on-1 tutoring for math, science, English, and more.
              Personalized learning that actually works.
            </p>
          </div>

          {/* Discount Card */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Your discount</p>
                  <p className="text-3xl font-bold text-primary">
                    ${referralData?.discountAmount || 25} OFF
                  </p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="text-xl font-mono font-bold tracking-wider">
                    {referralData?.code}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Applied automatically at checkout
              </p>
            </CardContent>
          </Card>

          {/* CTA Button */}
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="w-full md:w-auto px-12 gap-2 text-lg h-14"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>

          {/* Features */}
          <div className="pt-8 space-y-3">
            <p className="text-sm text-muted-foreground">What you'll get:</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {[
                'Expert tutors',
                '1-on-1 sessions',
                'Flexible scheduling',
                'All subjects',
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-1.5 text-muted-foreground"
                >
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Learn2Lead. All rights reserved.
      </footer>
    </div>
  );
};

export default ReferralLanding;
