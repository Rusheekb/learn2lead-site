import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { addBreadcrumb, captureException } from '@/lib/sentry';
import { logger } from '@/lib/logger';

const log = logger.create('StudentPaymentRecorder');

interface StudentPaymentRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
  initialStudentName?: string;
}

interface StudentOption {
  name: string;
  email: string;
  classRate: number | null;
  prepaidBalance: number;
}

type Step = 'input' | 'confirm';

const StudentPaymentRecorder: React.FC<StudentPaymentRecorderProps> = ({
  open,
  onOpenChange,
  onPaymentRecorded,
  initialStudentName,
}) => {
  const [step, setStep] = useState<Step>('input');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentName, setSelectedStudentName] = useState(
    initialStudentName ?? ''
  );
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((s) => s.name === selectedStudentName) ?? null,
    [students, selectedStudentName]
  );

  // Fetch all active students — any payment source
  useEffect(() => {
    if (!open) return;
    supabase
      .from('students')
      .select('name, email, class_rate, prepaid_balance')
      .eq('active', true)
      .then(({ data }) => {
        if (data) {
          setStudents(
            data.map((s) => ({
              name: s.name,
              email: s.email,
              classRate: s.class_rate,
              prepaidBalance: Number(s.prepaid_balance) || 0,
            }))
          );
        }
      });
  }, [open]);

  // Fetch credit balance when student changes
  useEffect(() => {
    if (!selectedStudent) {
      setCurrentCredits(null);
      setSubscriptionId(null);
      setProfileId(null);
      return;
    }
    setIsLoadingInfo(true);
    (async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', selectedStudent.email)
          .maybeSingle();

        let credits = 0;
        let subId: string | null = null;

        if (profile) {
          setProfileId(profile.id);
          const { data: sub } = await supabase
            .from('student_subscriptions')
            .select('id, credits_remaining')
            .eq('student_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (sub) {
            credits = sub.credits_remaining;
            subId = sub.id;
          }
        }

        setCurrentCredits(credits);
        setSubscriptionId(subId);
      } catch (err) {
        log.error('Error loading student info', err);
      } finally {
        setIsLoadingInfo(false);
      }
    })();
  }, [selectedStudent]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('input');
      setSelectedStudentName(initialStudentName ?? '');
      setCurrentCredits(null);
      setSubscriptionId(null);
      setProfileId(null);
      setAmount('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open, initialStudentName]);

  const calculations = useMemo(() => {
    if (!selectedStudent?.classRate) return null;
    const rate = selectedStudent.classRate;
    const entered = parseFloat(amount) || 0;
    const totalAvailable = entered + selectedStudent.prepaidBalance;
    const creditsToAdd = Math.floor(totalAvailable / rate);
    const newSurplus =
      Math.round((totalAvailable - creditsToAdd * rate) * 100) / 100;
    return {
      creditsToAdd,
      newSurplus,
      newCredits: (currentCredits ?? 0) + creditsToAdd,
    };
  }, [selectedStudent, amount, currentCredits]);

  const canContinue =
    !!selectedStudent &&
    !!selectedStudent.classRate &&
    parseFloat(amount) > 0 &&
    currentCredits !== null;

  const handleConfirm = async () => {
    if (!calculations || !selectedStudent || !profileId) return;
    setIsSubmitting(true);

    addBreadcrumb({
      category: 'credits.add',
      message: 'Adding credits',
      data: {
        student: selectedStudent.name,
        amount: parseFloat(amount),
        credits: calculations.creditsToAdd,
      },
    });

    try {
      // 1. Add credits to the ledger
      if (calculations.creditsToAdd > 0) {
        const { data: latest } = await supabase
          .from('class_credits_ledger')
          .select('balance_after')
          .eq('student_id', profileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const currentBalance = latest?.balance_after ?? currentCredits ?? 0;
        const ledgerRow: Record<string, unknown> = {
          student_id: profileId,
          transaction_type: 'credit',
          amount: calculations.creditsToAdd,
          balance_after: currentBalance + calculations.creditsToAdd,
          reason: `Manual credit allocation — $${parseFloat(amount).toFixed(2)} received on ${paymentDate}`,
        };
        if (subscriptionId) ledgerRow.subscription_id = subscriptionId;

        const { error: ledgerErr } = await supabase
          .from('class_credits_ledger')
          .insert(ledgerRow);
        if (ledgerErr) throw ledgerErr;
      }

      // 2. Update prepaid balance on the student record (carries over fractional remainder)
      const { error: studentErr } = await supabase
        .from('students')
        .update({ prepaid_balance: calculations.newSurplus })
        .eq('name', selectedStudent.name);
      if (studentErr) throw studentErr;

      // 3. Notify the student
      const notifParts = [
        `Payment of $${parseFloat(amount).toFixed(2)} received`,
      ];
      if (calculations.creditsToAdd > 0)
        notifParts.push(
          `${calculations.creditsToAdd} credit${calculations.creditsToAdd !== 1 ? 's' : ''} added`
        );
      await supabase.from('notifications').insert({
        user_id: profileId,
        message: notifParts.join('. ') + '.',
        type: 'payment_received',
      });

      addBreadcrumb({
        category: 'credits.add',
        message: 'Credits added successfully',
      });

      const summary: string[] = [];
      if (calculations.creditsToAdd > 0)
        summary.push(
          `${calculations.creditsToAdd} credit${calculations.creditsToAdd !== 1 ? 's' : ''} added`
        );
      if (calculations.newSurplus > 0)
        summary.push(`$${calculations.newSurplus.toFixed(2)} carried forward`);

      toast.success(summary.join(', ') || 'Credits updated');
      onPaymentRecorded();
      onOpenChange(false);
    } catch (err) {
      log.error('Failed to add credits', err);
      if (err instanceof Error)
        captureException(err, { student: selectedStudent.name });
      toast.error('Failed to add credits');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Add Credits
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {step === 'input' && (
            <>
              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select
                  value={selectedStudentName}
                  onValueChange={setSelectedStudentName}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student…" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStudent && (
                <>
                  {isLoadingInfo ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {!selectedStudent.classRate && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          No class rate set. Please configure it in the
                          student's profile first.
                        </div>
                      )}

                      <Card>
                        <CardContent className="pt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Current Credits
                            </span>
                            <span className="font-medium">
                              {currentCredits ?? '—'} hrs
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Rate per Session
                            </span>
                            <span className="font-medium">
                              {selectedStudent.classRate
                                ? `$${selectedStudent.classRate.toFixed(2)}`
                                : '—'}
                            </span>
                          </div>
                          {selectedStudent.prepaidBalance > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Carried-forward Balance
                              </span>
                              <span className="font-medium">
                                ${selectedStudent.prepaidBalance.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Separator />

                      <div className="space-y-1.5">
                        <Label htmlFor="amount">Amount Received ($)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 300.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          disabled={!selectedStudent.classRate}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="paymentDate">Payment Date</Label>
                        <Input
                          id="paymentDate"
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>

                      {calculations && parseFloat(amount) > 0 && (
                        <div className="p-3 rounded-md bg-primary/5 border border-primary/20 text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Credits to add
                            </span>
                            <span className="font-semibold text-primary">
                              +{calculations.creditsToAdd} hr
                              {calculations.creditsToAdd !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {calculations.newSurplus > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Carried forward
                              </span>
                              <span className="font-medium">
                                ${calculations.newSurplus.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {step === 'confirm' && calculations && selectedStudent && (
            <Card>
              <CardContent className="pt-4 space-y-3 text-sm">
                <h4 className="font-semibold text-base">
                  {selectedStudent.name}
                </h4>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Received</span>
                  <span className="font-bold text-lg">
                    ${parseFloat(amount).toFixed(2)}
                  </span>
                </div>
                {selectedStudent.prepaidBalance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      + Carried Forward
                    </span>
                    <span className="font-medium">
                      ${selectedStudent.prepaidBalance.toFixed(2)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credits</span>
                  <span>
                    {currentCredits ?? 0} hrs{' '}
                    <ArrowRight className="inline h-3 w-3 mx-1" />
                    <span className="font-bold text-primary">
                      {calculations.newCredits} hrs
                    </span>
                  </span>
                </div>
                {calculations.newSurplus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      New Carried-forward Balance
                    </span>
                    <span className="font-medium">
                      ${calculations.newSurplus.toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          {step === 'input' && (
            <Button onClick={() => setStep('confirm')} disabled={!canContinue}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirm
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPaymentRecorder;
