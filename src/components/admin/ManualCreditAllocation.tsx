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

  // Direct payment states
  const [directEmail, setDirectEmail] = useState('');
  const [directCredits, setDirectCredits] = useState('');
  const [directNote, setDirectNote] = useState('');
  const [directLoading, setDirectLoading] = useState(false);

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

  const handleDirectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate inputs
      if (!directEmail || !directCredits) {
        toast.error('Please provide student email and number of credits');
        return;
      }

      const credits = parseInt(directCredits);
      if (isNaN(credits) || credits <= 0) {
        toast.error('Credits must be a positive number');
        return;
      }

      // Find student profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('email', directEmail.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast.error(`No student found with email: ${directEmail}`);
        return;
      }

      // Find or create subscription
      let { data: subscription, error: subError } = await supabase
        .from('student_subscriptions')
        .select('id, credits_remaining')
        .eq('student_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) throw subError;

      // Create manual subscription if none exists
      if (!subscription) {
        const { data: newSub, error: createError } = await supabase
          .from('student_subscriptions')
          .insert({
            student_id: profile.id,
            stripe_subscription_id: `manual_${crypto.randomUUID()}`,
            stripe_customer_id: `manual_${crypto.randomUUID()}`,
            plan_id: null,
            status: 'active',
            credits_allocated: 0,
            credits_remaining: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select('id, credits_remaining')
          .single();

        if (createError) throw createError;
        subscription = newSub;
      }

      const newBalance = (subscription.credits_remaining || 0) + credits;

      // Update credits
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
          transaction_type: 'credit',
          amount: credits,
          balance_after: newBalance,
          reason: `Direct payment (Zelle) - ${directNote || 'Manual payment'}`,
        });

      if (ledgerError) throw ledgerError;

      const studentName = profile.first_name || profile.email;
      toast.success(`Successfully added ${credits} credits to ${studentName}`, {
        description: `New balance: ${newBalance} credits`,
      });

      // Reset form
      setDirectEmail('');
      setDirectCredits('');
      setDirectNote('');

    } catch (error: any) {
      console.error('Direct payment error:', error);
      toast.error('Failed to add credits', {
        description: error.message || 'Unknown error occurred',
      });
    } finally {
      setDirectLoading(false);
    }
  };

  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💳 Credit Management
        </CardTitle>
        <CardDescription>
          Manage student credits for subscriptions, adjustments, and direct payments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="allocate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="allocate">Initial Allocation</TabsTrigger>
          <TabsTrigger value="adjust">Credit Adjustment</TabsTrigger>
          <TabsTrigger value="direct">Direct Payment</TabsTrigger>
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

          <TabsContent value="direct" className="space-y-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💰 Add credits for students who paid via Zelle or other direct payment methods.
              </p>
            </div>

            <form onSubmit={handleDirectPayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="direct-email">Student Email</Label>
                <Input
                  id="direct-email"
                  type="email"
                  placeholder="student@example.com"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                  disabled={directLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direct-credits">Number of Credits</Label>
                <Input
                  id="direct-credits"
                  type="number"
                  min="1"
                  placeholder="4"
                  value={directCredits}
                  onChange={(e) => setDirectCredits(e.target.value)}
                  disabled={directLoading}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Common packages: 4, 8, 12 credits
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direct-note">Note (Optional)</Label>
                <Textarea
                  id="direct-note"
                  placeholder="e.g., Zelle payment Jan 2025, Confirmation #ABC123"
                  value={directNote}
                  onChange={(e) => setDirectNote(e.target.value)}
                  disabled={directLoading}
                  rows={2}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={directLoading}
              >
                {directLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Credits...
                  </>
                ) : (
                  'Add Credits'
                )}
              </Button>
            </form>

            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>• Creates or updates student subscription automatically</p>
              <p>• Credits available immediately after adding</p>
              <p>• Full audit trail maintained in credit ledger</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
