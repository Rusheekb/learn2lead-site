import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReferralCode } from '@/hooks/useReferralCode';
import { copyToClipboard } from '@/utils/clipboardUtils';
import { toast } from 'sonner';
import { Copy, Gift, Users, DollarSign, Loader2, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const ReferralCodeSection: React.FC = () => {
  const { referralCode, usageStats, isLoading, isGenerating, error, requiresSubscription, generateCode } = useReferralCode();

  const handleCopyCode = async () => {
    if (!referralCode?.code) return;
    
    const success = await copyToClipboard(referralCode.code);
    if (success) {
      toast.success('Referral code copied to clipboard!');
    } else {
      toast.error('Failed to copy code');
    }
  };

  const handleCopyShareMessage = async () => {
    if (!referralCode?.code) return;
    
    const message = `Use my referral code ${referralCode.code} for $25 off your first month of tutoring! Sign up at learn2lead.com`;
    const success = await copyToClipboard(message);
    if (success) {
      toast.success('Share message copied to clipboard!');
    } else {
      toast.error('Failed to copy message');
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

  if (error) {
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
          <>
            {/* Code Display */}
            <div className="rounded-lg border bg-muted/50 p-4">
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

            {/* Share Message */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Quick Share</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-background p-3 text-sm">
                  Use my referral code <strong>{referralCode.code}</strong> for $25 off your first month!
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyShareMessage}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{usageStats?.timesUsed || 0}</p>
                <p className="text-sm text-muted-foreground">Friends Referred</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <DollarSign className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">${usageStats?.totalEarnings || 0}</p>
                <p className="text-sm text-muted-foreground">Credits Earned</p>
              </div>
            </div>

            {/* Usage History */}
            {usageStats && usageStats.usageHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Recent Referrals</p>
                <div className="rounded-lg border divide-y">
                  {usageStats.usageHistory.slice(0, 5).map((usage, index) => (
                    <div key={index} className="p-3 flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {usage.usedByEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(usage.usedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
