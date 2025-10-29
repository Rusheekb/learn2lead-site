import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const ManualCreditAllocation = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAllocateCredits = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manual-credit-allocation', {
        body: { email: email.trim() },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message, {
          description: `Plan: ${data.planName} | Credits: ${data.creditsAllocated}`,
        });
        setEmail('');
      } else {
        toast.warning(data.message || 'Could not allocate credits', {
          description: data.currentCredits ? `Current credits: ${data.currentCredits}` : undefined,
        });
      }
    } catch (error) {
      console.error('Credit allocation error:', error);
      toast.error('Failed to allocate credits', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚠️ Manual Credit Allocation
        </CardTitle>
        <CardDescription>
          Manually allocate credits for existing subscriptions that were created before webhook configuration.
          This should only be used for testing or fixing missed webhook events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Student Email</label>
          <Input
            type="email"
            placeholder="student@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button
          onClick={handleAllocateCredits}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Allocating Credits...
            </>
          ) : (
            'Allocate Credits'
          )}
        </Button>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• This will create a subscription record and allocate credits based on the user's active Stripe subscription</p>
          <p>• If credits are already allocated, it will show the current amount</p>
          <p>• Only works for users with active Stripe subscriptions</p>
        </div>
      </CardContent>
    </Card>
  );
};
