import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Link } from 'react-router-dom';

const OutstandingBalance: React.FC = () => {
  const { creditsRemaining, isLoading } = useSubscription();

  // Only show when fully loaded and student has no hours left
  if (isLoading || creditsRemaining > 0) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5 mb-6">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">No Hours Remaining</p>
              <p className="text-xs text-muted-foreground">
                Purchase more hours or contact your admin to continue
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/pricing">Purchase Hours</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OutstandingBalance;
