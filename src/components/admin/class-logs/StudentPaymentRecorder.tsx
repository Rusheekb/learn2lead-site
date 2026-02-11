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
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, ArrowLeft, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { batchUpdateStudentPaymentDate } from '@/services/class-operations/update/updatePaymentDate';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StudentPaymentRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}

interface StudentOption {
  name: string;
  email: string;
  classRate: number | null;
  paymentMethod: string | null;
  prepaidBalance: number;
}

interface StudentSummary {
  currentCredits: number;
  unpaidClasses: { id: string; date: string; classCost: number | null }[];
  lastPaidDate: string | null;
  subscriptionId: string | null;
  profileId: string | null;
}

type Step = 'select' | 'confirm';

const StudentPaymentRecorder: React.FC<StudentPaymentRecorderProps> = ({
  open,
  onOpenChange,
  onPaymentRecorded,
}) => {
  const [step, setStep] = useState<Step>('select');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((s) => s.name === selectedStudentName) || null,
    [students, selectedStudentName]
  );

  // Fetch Zelle students
  useEffect(() => {
    if (!open) return;
    const fetchStudents = async () => {
      const { data } = await supabase
        .from('students')
        .select('name, email, class_rate, payment_method, prepaid_balance')
        .eq('active', true)
        .or('payment_method.eq.zelle,payment_method.is.null');
      if (data) {
        setStudents(
          data.map((s) => ({
            name: s.name,
            email: s.email,
            classRate: s.class_rate,
            paymentMethod: s.payment_method,
            prepaidBalance: Number(s.prepaid_balance) || 0,
          }))
        );
      }
    };
    fetchStudents();
  }, [open]);

  // Fetch summary when student selected
  useEffect(() => {
    if (!selectedStudent) {
      setSummary(null);
      return;
    }
    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        // Unpaid class logs
        const { data: unpaidLogs } = await supabase
          .from('class_logs')
          .select('id, "Date", "Class Cost"')
          .or(`Student Name.eq.${selectedStudent.name},Student Name.eq.${selectedStudent.email}`)
          .is('student_payment_date', null)
          .order('Date', { ascending: true });

        // Last paid date
        const { data: lastPaid } = await supabase
          .from('class_logs')
          .select('student_payment_date')
          .or(`Student Name.eq.${selectedStudent.name},Student Name.eq.${selectedStudent.email}`)
          .not('student_payment_date', 'is', null)
          .order('student_payment_date', { ascending: false })
          .limit(1);

        // Get profile id for credits
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', selectedStudent.email)
          .maybeSingle();

        let currentCredits = 0;
        let subscriptionId: string | null = null;
        if (profile) {
          const { data: sub } = await supabase
            .from('student_subscriptions')
            .select('id, credits_remaining')
            .eq('student_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (sub) {
            currentCredits = sub.credits_remaining;
            subscriptionId = sub.id;
          }
        }

        setSummary({
          currentCredits,
          unpaidClasses: (unpaidLogs || []).map((l: any) => ({
            id: l.id,
            date: l['Date'],
            classCost: l['Class Cost'],
          })),
          lastPaidDate: lastPaid?.[0]?.student_payment_date || null,
          subscriptionId,
          profileId: profile?.id || null,
        });
      } catch (err) {
        console.error('Error fetching student summary:', err);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [selectedStudent]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedStudentName('');
      setSummary(null);
      setAmount('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open]);

  // Calculations
  const calculations = useMemo(() => {
    if (!selectedStudent || !summary || !selectedStudent.classRate) return null;
    const rate = selectedStudent.classRate;
    const entered = parseFloat(amount) || 0;
    const totalAvailable = entered + selectedStudent.prepaidBalance;

    // Determine how many unpaid classes can be covered
    let unpaidCost = 0;
    let classesToMark: typeof summary.unpaidClasses = [];
    for (const cls of summary.unpaidClasses) {
      const cost = cls.classCost ?? rate;
      if (unpaidCost + cost <= totalAvailable) {
        unpaidCost += cost;
        classesToMark.push(cls);
      } else {
        break;
      }
    }

    const remainingAfterUnpaid = totalAvailable - unpaidCost;
    const creditsToAdd = Math.floor(remainingAfterUnpaid / rate);
    const newSurplus = remainingAfterUnpaid - creditsToAdd * rate;

    return {
      totalAvailable,
      classesToMark,
      unpaidCost,
      remainingAfterUnpaid,
      creditsToAdd,
      newSurplus: Math.round(newSurplus * 100) / 100,
      newCredits: summary.currentCredits + creditsToAdd,
      unpaidRemaining: summary.unpaidClasses.length - classesToMark.length,
    };
  }, [selectedStudent, summary, amount]);

  const canContinue =
    selectedStudent &&
    summary &&
    selectedStudent.classRate &&
    parseFloat(amount) > 0;

  const handleConfirm = async () => {
    if (!calculations || !selectedStudent || !summary) return;
    setIsSubmitting(true);
    try {
      const dateObj = new Date(paymentDate + 'T12:00:00');

      // 1. Batch mark unpaid classes as paid
      if (calculations.classesToMark.length > 0) {
        const ids = calculations.classesToMark.map((c) => c.id);
        const success = await batchUpdateStudentPaymentDate(ids, dateObj);
        if (!success) throw new Error('Failed to update payment dates');
      }

      // 2. Add credits to ledger if any
      if (calculations.creditsToAdd > 0 && summary.profileId) {
        // Get current balance
        const { data: latestLedger } = await supabase
          .from('class_credits_ledger')
          .select('balance_after')
          .eq('student_id', summary.profileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const currentBalance = latestLedger?.balance_after ?? 0;

        const ledgerInsert: any = {
          student_id: summary.profileId,
          transaction_type: 'credit',
          amount: calculations.creditsToAdd,
          balance_after: currentBalance + calculations.creditsToAdd,
          reason: `Direct payment (Zelle) - $${parseFloat(amount).toFixed(2)}`,
        };
        if (summary.subscriptionId) {
          ledgerInsert.subscription_id = summary.subscriptionId;
        }

        const { error: ledgerError } = await supabase
          .from('class_credits_ledger')
          .insert(ledgerInsert);
        if (ledgerError) throw ledgerError;
      }

      // 3. Update prepaid balance
      const { error: updateError } = await supabase
        .from('students')
        .update({ prepaid_balance: calculations.newSurplus })
        .eq('name', selectedStudent.name);
      if (updateError) throw updateError;

      const parts: string[] = [];
      if (calculations.classesToMark.length > 0)
        parts.push(`Marked ${calculations.classesToMark.length} classes paid`);
      if (calculations.creditsToAdd > 0)
        parts.push(`added ${calculations.creditsToAdd} credits`);
      if (calculations.newSurplus > 0)
        parts.push(`$${calculations.newSurplus.toFixed(2)} surplus stored`);

      toast.success(parts.join(', '));
      onPaymentRecorded();
      onOpenChange(false);
    } catch (err) {
      console.error('Payment recording error:', err);
      toast.error('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unpaidTotal = useMemo(() => {
    if (!summary || !selectedStudent) return 0;
    return summary.unpaidClasses.reduce(
      (sum, c) => sum + (c.classCost ?? selectedStudent.classRate ?? 0),
      0
    );
  }, [summary, selectedStudent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {step === 'select' && (
            <>
              {/* Student Picker */}
              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select value={selectedStudentName} onValueChange={setSelectedStudentName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student..." />
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

              {/* Current Summary */}
              {selectedStudent && (
                <>
                  {isLoadingSummary ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : summary ? (
                    <>
                      {!selectedStudent.classRate && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          No class rate set. Please set it in the student's profile first.
                        </div>
                      )}

                      <Card>
                        <CardContent className="pt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Class Rate</span>
                            <span className="font-medium">
                              {selectedStudent.classRate
                                ? `$${selectedStudent.classRate.toFixed(2)}/class`
                                : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment Method</span>
                            <Badge variant="outline" className="capitalize">
                              {selectedStudent.paymentMethod || 'zelle'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Credits</span>
                            <span className="font-medium">{summary.currentCredits}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Unpaid Classes</span>
                            <span className="font-medium text-destructive">
                              {summary.unpaidClasses.length} (${unpaidTotal.toFixed(2)} owed)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Prepaid Balance</span>
                            <span className="font-medium">
                              ${selectedStudent.prepaidBalance.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Paid Date</span>
                            <span className="font-medium">
                              {summary.lastPaidDate
                                ? format(new Date(summary.lastPaidDate + 'T12:00:00'), 'M/d/yy')
                                : '—'}
                            </span>
                          </div>
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
                    </>
                  ) : null}
                </>
              )}
            </>
          )}

          {step === 'confirm' && calculations && selectedStudent && summary && (
            <>
              <Card>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <h4 className="font-semibold text-base">
                    Payment Summary for {selectedStudent.name}
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
                      <span className="text-muted-foreground">+ Existing Prepaid</span>
                      <span className="font-medium">
                        ${selectedStudent.prepaidBalance.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unpaid classes to mark paid</span>
                    <span className="font-medium">
                      {calculations.classesToMark.length} (-${calculations.unpaidCost.toFixed(2)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining after unpaid</span>
                    <span className="font-medium">
                      ${calculations.remainingAfterUnpaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credits to add</span>
                    <span className="font-medium text-primary">
                      +{calculations.creditsToAdd} classes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surplus (prepaid balance)</span>
                    <span className="font-medium">
                      ${calculations.newSurplus.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-2 text-sm">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Before → After
                  </h4>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credits</span>
                    <span>
                      {summary.currentCredits}{' '}
                      <ArrowRight className="inline h-3 w-3 mx-1" />
                      <span className="font-bold text-primary">{calculations.newCredits}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prepaid Balance</span>
                    <span>
                      ${selectedStudent.prepaidBalance.toFixed(2)}{' '}
                      <ArrowRight className="inline h-3 w-3 mx-1" />
                      <span className="font-bold">${calculations.newSurplus.toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unpaid Classes</span>
                    <span>
                      {summary.unpaidClasses.length}{' '}
                      <ArrowRight className="inline h-3 w-3 mx-1" />
                      <span className="font-bold">{calculations.unpaidRemaining}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          {step === 'select' && (
            <Button onClick={() => setStep('confirm')} disabled={!canContinue}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirm Payment
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPaymentRecorder;
