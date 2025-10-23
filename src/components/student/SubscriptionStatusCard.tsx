import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PlanBadge } from '@/components/shared/PlanBadge';
import { CreditBadge } from '@/components/shared/CreditBadge';
import { useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SubscriptionStatusCard: React.FC = () => {
  const { subscribed, planName, creditsRemaining, subscriptionEnd, isLoading, error } = useSubscription();
  const navigate = useNavigate();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setIsOpeningPortal(true);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please log in to manage your subscription');
        return;
      }

      const { data, error: portalError } = await supabase.functions.invoke(
        'customer-portal',
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`
          }
        }
      );

      if (portalError || !data?.url) {
        throw portalError || new Error('Failed to create portal session');
      }

      // Open Stripe Customer Portal in new tab
      window.open(data.url, '_blank');
      
      toast.success('Opening subscription management portal...');
    } catch (err) {
      console.error('Error opening customer portal:', err);
      toast.error('Failed to open subscription management portal');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
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
            <p className="text-sm">Error loading subscription: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscribed) {
    return (
      <Card className="mb-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="text-xl">No Active Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Subscribe to a plan to start booking classes and accessing premium features.
          </p>
          <Button onClick={() => navigate('/pricing')} className="w-full">
            <TrendingUp className="mr-2 h-4 w-4" />
            View Plans & Subscribe
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
          <CardTitle className="text-xl">Your Subscription</CardTitle>
          <PlanBadge planName={planName} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Credits Available</span>
            <CreditBadge credits={creditsRemaining} />
          </div>
          
          {subscriptionEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Renewal Date</span>
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(subscriptionEnd), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          )}
        </div>

        {creditsRemaining !== null && creditsRemaining === 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">
              You've used all your classes this period. Upgrade to continue!
            </p>
          </div>
        )}

        {creditsRemaining !== null && creditsRemaining > 0 && creditsRemaining < 3 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
              Running low on classes. Consider upgrading your plan!
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate('/pricing')}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
          <Button 
            variant="secondary" 
            className="flex-1"
            onClick={handleManageSubscription}
            disabled={isOpeningPortal}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {isOpeningPortal ? 'Opening...' : 'Manage Subscription'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
