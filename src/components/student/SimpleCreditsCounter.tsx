import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { CreditBadge } from '@/components/shared/CreditBadge';
import { Skeleton } from '@/components/ui/skeleton';

export const SimpleCreditsCounter: React.FC = memo(() => {
  const { creditsRemaining, pricePerClass, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <Card className="p-4 mb-6">
        <Skeleton className="h-6 w-48" />
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Hours Available
        </span>
        <CreditBadge credits={creditsRemaining} pricePerClass={pricePerClass} hideAmount />
      </div>
    </Card>
  );
});

SimpleCreditsCounter.displayName = 'SimpleCreditsCounter';
