import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PlanBadge } from '@/components/shared/PlanBadge';
import { CreditBadge } from '@/components/shared/CreditBadge';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SubscriptionStatusCard: React.FC = () => {
  const { subscribed, planName, creditsRemaining, isLoading, error } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Error loading credits: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscribed) {
    return (
      <Card className="mb-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="text-xl">No Credits Available</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Purchase a credit pack to start booking classes.
          </p>
          <Button onClick={() => navigate('/pricing')} className="w-full">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Buy Credits
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getBorderColor = () => {
    if (creditsRemaining === null) return '';
    if (creditsRemaining === 0) return 'border-destructive';
    if (creditsRemaining < 3) return 'border-orange-500';
    return 'border-primary';
  };

  return (
    <Card className={cn('mb-6', getBorderColor())}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Your Credits</CardTitle>
          <PlanBadge planName={planName} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Credits Available</span>
          <CreditBadge credits={creditsRemaining} />
        </div>

        {creditsRemaining !== null && creditsRemaining === 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">
              You've used all your credits. Purchase more to continue booking classes.
            </p>
          </div>
        )}

        {creditsRemaining !== null && creditsRemaining > 0 && creditsRemaining < 3 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
              Running low on credits — consider topping up!
            </p>
          </div>
        )}

        <Button 
          variant={creditsRemaining === 0 ? 'default' : 'outline'}
          className="w-full"
          onClick={() => navigate('/pricing')}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {creditsRemaining === 0 ? 'Buy More Credits' : 'Top Up Credits'}
        </Button>
      </CardContent>
    </Card>
  );
};
