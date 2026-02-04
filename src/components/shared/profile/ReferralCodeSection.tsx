import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReferralCode } from '@/hooks/useReferralCode';
import { copyToClipboard } from '@/utils/clipboardUtils';
import { toast } from 'sonner';
import { Copy, Gift, Loader2, BarChart3, Share2, Link2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SocialShareButtons, ShareLinkCard, ReferralStats } from '@/components/referral';

const REFERRAL_BASE_URL = 'https://learn2lead.vercel.app/refer';

const ReferralCodeSection: React.FC = () => {
  const { 
    referralCode, 
    usageStats, 
    isLoading, 
    isGenerating, 
    error, 
    requiresSubscription, 
    generateCode 
  } = useReferralCode();
  const [activeTab, setActiveTab] = useState('overview');

  const referralUrl = referralCode?.code 
    ? `${REFERRAL_BASE_URL}/${referralCode.code}` 
    : '';

  const handleCopyCode = async () => {
    if (!referralCode?.code) return;
    
    const success = await copyToClipboard(referralCode.code);
    if (success) {
      toast.success('Referral code copied to clipboard!');
    } else {
      toast.error('Failed to copy code');
    }
  };

  const handleGenerateCode = async () => {
    const code = await generateCode();
    if (code) {
      toast.success(`Your referral code ${code} has been created!`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !requiresSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Referral Program
        </CardTitle>
        <CardDescription>
          Share your referral code and earn $25 credit for each friend who subscribes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {referralCode ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="gap-2">
                <Gift className="h-4 w-4 hidden sm:inline" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2">
                <BarChart3 className="h-4 w-4 hidden sm:inline" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="share" className="gap-2">
                <Share2 className="h-4 w-4 hidden sm:inline" />
                Share
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Code Display */}
              <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                <p className="text-sm text-muted-foreground mb-2">Your Referral Code</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold tracking-wider text-primary">
                    {referralCode.code}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {usageStats?.timesUsed || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Friends Referred</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    ${usageStats?.totalEarnings || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Credits Earned</p>
                </div>
              </div>

              {/* Quick Share */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Share</p>
                <SocialShareButtons
                  referralCode={referralCode.code}
                  referralUrl={referralUrl}
                  discountAmount={referralCode.discountAmount}
                />
              </div>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="mt-4">
              <ReferralStats
                timesUsed={usageStats?.timesUsed || 0}
                totalEarnings={usageStats?.totalEarnings || 0}
                usageHistory={usageStats?.usageHistory || []}
                createdAt={referralCode.createdAt}
              />
            </TabsContent>

            {/* Share Tab */}
            <TabsContent value="share" className="space-y-4 mt-4">
              <ShareLinkCard
                referralCode={referralCode.code}
                referralUrl={referralUrl}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Share on Social</p>
                <SocialShareButtons
                  referralCode={referralCode.code}
                  referralUrl={referralUrl}
                  discountAmount={referralCode.discountAmount}
                  variant="buttons"
                />
              </div>

              {/* Share Message Preview */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">Share Message</p>
                <p className="text-sm text-muted-foreground">
                  I'm learning with Learn2Lead tutoring! Use my referral code{' '}
                  <span className="font-semibold text-foreground">{referralCode.code}</span>{' '}
                  for ${referralCode.discountAmount} off your first month.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Generate Code CTA */
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            {requiresSubscription ? (
              <div className="space-y-3">
                <h3 className="font-semibold">Subscription Required</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Generate your unique referral code by subscribing to one of our plans.
                  Earn $25 for each friend who subscribes using your code!
                </p>
                <Button asChild>
                  <Link to="/pricing">View Plans</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-semibold">Get Your Referral Code</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Generate your unique referral code and earn $25 for each friend who subscribes using your code.
                </p>
                <Button
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4" />
                      Generate My Referral Code
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralCodeSection;
