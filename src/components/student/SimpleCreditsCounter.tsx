import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { CreditBadge } from '@/components/shared/CreditBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface SimpleCreditsCounterProps {
  label?: string;
}

export const SimpleCreditsCounter: React.FC<SimpleCreditsCounterProps> = memo(
  ({ label = 'Hours Available' }) => {
    const {
      creditsRemaining,
      pricePerHour,
      isLoading,
      managedBy,
      hoursHidden,
    } = useSubscription();

    if (isLoading) {
      return (
        <Card className="p-4 mb-6">
          <Skeleton className="h-6 w-48" />
        </Card>
      );
    }

    // A student whose parent pays: hours only (if the parent allows), no
    // buy link, no prices.
    if (managedBy) {
      return (
        <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {hoursHidden
                ? `Your hours are managed by ${managedBy.name}`
                : `Family hours · managed by ${managedBy.name}`}
            </span>
            {!hoursHidden && (
              <CreditBadge credits={creditsRemaining} hideAmount />
            )}
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          <Link to="/pricing" className="rounded-full">
            <CreditBadge
              credits={creditsRemaining}
              pricePerHour={pricePerHour}
              hideAmount
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
      </Card>
    );
  }
);

SimpleCreditsCounter.displayName = 'SimpleCreditsCounter';
