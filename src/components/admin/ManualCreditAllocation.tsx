import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Minus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const ManualCreditAllocation = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Credit adjustment states
  const [adjustEmail, setAdjustEmail] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

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

  const handleAdjustCredits = async (type: 'add' | 'subtract') => {
    if (!adjustEmail.trim()) {
      toast.error('Please enter a student email address');
      return;
    }
    if (!adjustAmount || parseInt(adjustAmount) <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }
    if (!adjustReason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    setAdjustLoading(true);
    try {
      // Find student profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', adjustEmail.trim())
        .single();

      if (profileError || !profile) {
        throw new Error('Student not found');
      }

      // Get current subscription
      const { data: subscription, error: subError } = await supabase
        .from('student_subscriptions')
        .select('id, credits_remaining')
        .eq('student_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) throw subError;
      if (!subscription) {
        throw new Error('No active subscription found for this student');
      }

      const amount = parseInt(adjustAmount);
      const adjustmentAmount = type === 'add' ? amount : -amount;
      const newBalance = subscription.credits_remaining + adjustmentAmount;

      if (newBalance < 0) {
        throw new Error('Adjustment would result in negative credit balance');
      }

      // Update subscription credits
      const { error: updateError } = await supabase
        .from('student_subscriptions')
        .update({ credits_remaining: newBalance })
        .eq('id', subscription.id);

      if (updateError) throw updateError;

      // Create ledger entry
      const { error: ledgerError } = await supabase
        .from('class_credits_ledger')
        .insert({
          student_id: profile.id,
          subscription_id: subscription.id,
          transaction_type: 'adjustment',
          amount: adjustmentAmount,
          balance_after: newBalance,
          reason: `Admin adjustment: ${adjustReason.trim()}`,
        });

      if (ledgerError) throw ledgerError;

      toast.success(
        `${type === 'add' ? 'Added' : 'Subtracted'} ${amount} credit${amount !== 1 ? 's' : ''}`,
        {
          description: `New balance: ${newBalance} credits`,
        }
      );

      // Reset form
      setAdjustEmail('');
      setAdjustAmount('');
      setAdjustReason('');
    } catch (error) {
      console.error('Credit adjustment error:', error);
      toast.error('Failed to adjust credits', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚠️ Manual Credit Management
        </CardTitle>
        <CardDescription>
          Allocate initial credits or make manual adjustments for special circumstances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="allocate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="allocate">Initial Allocation</TabsTrigger>
            <TabsTrigger value="adjust">Credit Adjustment</TabsTrigger>
          </TabsList>

          <TabsContent value="allocate" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Student Email</Label>
              <Input
                id="email"
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
                'Allocate Credits from Stripe'
              )}
            </Button>
            <div className="text-xs text-muted-foreground space-y-1 pt-2">
              <p>• Creates subscription record based on active Stripe subscription</p>
              <p>• Allocates credits according to the subscription plan</p>
              <p>• Only works for users with active Stripe subscriptions</p>
            </div>
          </TabsContent>

          <TabsContent value="adjust" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="adjust-email">Student Email</Label>
              <Input
                id="adjust-email"
                type="email"
                placeholder="student@example.com"
                value={adjustEmail}
                onChange={(e) => setAdjustEmail(e.target.value)}
                disabled={adjustLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Credit Amount</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                placeholder="Enter number of credits"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                disabled={adjustLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Adjustment</Label>
              <Textarea
                id="reason"
                placeholder="Explain why credits are being adjusted (e.g., 'Compensation for technical issue', 'Mistakenly completed class')"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                disabled={adjustLoading}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleAdjustCredits('add')}
                disabled={adjustLoading}
                className="flex-1"
                variant="default"
              >
                {adjustLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Credits
              </Button>
              <Button
                onClick={() => handleAdjustCredits('subtract')}
                disabled={adjustLoading}
                className="flex-1"
                variant="destructive"
              >
                {adjustLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Minus className="mr-2 h-4 w-4" />
                )}
                Subtract Credits
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p className="font-medium">⚠️ Use this feature carefully:</p>
              <p>• Creates a permanent ledger entry with your reason</p>
              <p>• Used for compensations, corrections, or special circumstances</p>
              <p>• Cannot be undone - consider the impact before adjusting</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
