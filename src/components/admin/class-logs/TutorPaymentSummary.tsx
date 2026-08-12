import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { batchUpdateTutorPaymentDate } from '@/services/class-operations/update/updatePaymentDate';
import {
  DollarSign,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { classLogsKeys } from '@/hooks/useClassLogs';
import { logAdminAction } from '@/services/adminActivityLog';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TutorPaymentSummaryProps {
  onPaymentUpdated: () => void;
}

interface TutorSummaryRow {
  tutor_name: string;
  tutor_user_id: string | null;
  unpaid_count: number;
  total_owed: number;
  class_ids: string[];
  last_payment_date: string | null;
}

interface PayrollRun {
  id: string;
  tutor_name: string;
  paid_at: string;
  amount_paid: number;
  class_count: number;
  created_at: string;
}

function formatLastPaid(date: string | null): string {
  if (!date) return 'All time (never paid)';
  try {
    return `Since ${format(parseISO(date), 'MMM d, yyyy')}`;
  } catch {
    return 'Since unknown date';
  }
}

const TutorPaymentSummary: React.FC<TutorPaymentSummaryProps> = ({
  onPaymentUpdated,
}) => {
  const queryClient = useQueryClient();
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: payrollHistory = [] } = useQuery<PayrollRun[]>({
    queryKey: ['tutor-payroll-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_payroll_runs')
        .select('id, tutor_name, paid_at, amount_paid, class_count, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as PayrollRun[]) || [];
    },
    enabled: historyOpen,
    staleTime: 30_000,
  });

  const { data: tutorSummaries = [] } = useQuery<TutorSummaryRow[]>({
    queryKey: [...classLogsKeys.all, 'tutor-unpaid-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tutor_unpaid_summary');
      if (error) throw error;
      return (data as unknown as TutorSummaryRow[]) || [];
    },
    staleTime: 30_000,
  });

  const grandTotal = tutorSummaries.reduce(
    (sum, t) => sum + Number(t.total_owed),
    0
  );

  const allSelected =
    tutorSummaries.length > 0 &&
    tutorSummaries.every((t) => selectedNames.has(t.tutor_name));
  const someSelected = selectedNames.size > 0 && !allSelected;
  const confirmTargets = tutorSummaries.filter((t) =>
    selectedNames.has(t.tutor_name)
  );
  const selectedTotal = confirmTargets.reduce(
    (s, t) => s + Number(t.total_owed),
    0
  );

  const toggleAll = () =>
    setSelectedNames(
      allSelected ? new Set() : new Set(tutorSummaries.map((t) => t.tutor_name))
    );

  const toggleOne = (name: string) =>
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });

  const handleConfirm = async () => {
    const classIds = confirmTargets.flatMap((t) => t.class_ids);
    const ok = await batchUpdateTutorPaymentDate(classIds, new Date());
    if (ok) {
      const today = format(new Date(), 'yyyy-MM-dd');
      await supabase.from('tutor_payroll_runs').insert(
        confirmTargets.map((t) => ({
          tutor_name: t.tutor_name,
          tutor_user_id: t.tutor_user_id ?? null,
          paid_at: today,
          amount_paid: Number(t.total_owed),
          class_count: t.unpaid_count,
          class_ids: t.class_ids,
        }))
      );

      const names =
        confirmTargets.length === 1
          ? confirmTargets[0].tutor_name
          : `${confirmTargets.length} tutors`;
      toast.success(`Payroll processed for ${names}`);
      logAdminAction({
        actionType: 'payroll_processed',
        description: `Processed payroll for ${names} — $${selectedTotal.toFixed(2)} total`,
        entityType: 'tutor',
        metadata: {
          tutors: confirmTargets.map((t) => t.tutor_name),
          total: selectedTotal,
        },
      });
      queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tutor-payroll-history'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity-log'] });
      setSelectedNames(new Set());
      onPaymentUpdated();
    } else {
      toast.error('Failed to process payroll');
    }
    setConfirmOpen(false);
  };

  if (tutorSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
          All tutors are paid up!
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Tutor Payroll
            <span className="text-muted-foreground font-normal text-base">
              — Total owed: ${grandTotal.toFixed(2)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-0">
          {/* Table */}
          <div className="w-full">
            {/* Header row */}
            <div className="flex items-center gap-3 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
              <Checkbox
                checked={
                  allSelected || (someSelected ? 'indeterminate' : false)
                }
                onCheckedChange={toggleAll}
                aria-label="Select all tutors"
              />
              <span className="flex-1">Tutor</span>
              <span className="hidden sm:block w-52">Classes</span>
              <span className="w-20 text-right">Amount</span>
            </div>

            {/* Tutor rows */}
            {tutorSummaries.map((summary) => {
              const isChecked = selectedNames.has(summary.tutor_name);
              return (
                <div
                  key={summary.tutor_name}
                  className={`flex items-center gap-3 px-3 py-3 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-muted/30 ${
                    isChecked ? 'bg-muted/20' : ''
                  }`}
                  onClick={() => toggleOne(summary.tutor_name)}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleOne(summary.tutor_name)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${summary.tutor_name}`}
                  />
                  <span className="flex-1 font-medium text-sm truncate">
                    {summary.tutor_name}
                  </span>
                  <span className="hidden sm:block w-52 text-sm text-muted-foreground">
                    {summary.unpaid_count} class
                    {summary.unpaid_count !== 1 ? 'es' : ''} ·{' '}
                    {formatLastPaid(summary.last_payment_date)}
                  </span>
                  <span className="w-20 text-right font-bold text-sm whitespace-nowrap">
                    ${Number(summary.total_owed).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sticky bottom action bar */}
          {selectedNames.size > 0 && (
            <div className="sticky bottom-0 bg-background border-t py-3 px-1 flex items-center justify-between gap-4 mt-0">
              <span className="text-sm text-muted-foreground">
                {selectedNames.size} tutor
                {selectedNames.size !== 1 ? 's' : ''} selected ·{' '}
                <span className="font-semibold text-foreground">
                  ${selectedTotal.toFixed(2)}
                </span>
              </span>
              <Button size="sm" onClick={() => setConfirmOpen(true)}>
                Process Payroll
              </Button>
            </div>
          )}

          {/* Payroll History */}
          <div
            className={`border-t pt-3 pb-3 ${selectedNames.size > 0 ? 'mt-0' : 'mt-4'}`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-muted-foreground h-auto py-1 px-0"
              onClick={() => setHistoryOpen((o) => !o)}
            >
              <History className="h-4 w-4" />
              Payroll History
              {historyOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>

            {historyOpen && (
              <div className="mt-2 space-y-1.5">
                {payrollHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No payroll runs recorded yet.
                  </p>
                ) : (
                  payrollHistory.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0"
                    >
                      <div>
                        <span className="font-medium">{run.tutor_name}</span>
                        <span className="text-muted-foreground ml-2">
                          · {run.class_count} class
                          {run.class_count !== 1 ? 'es' : ''}
                          {' · '}
                          {format(parseISO(run.paid_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <span className="font-medium tabular-nums">
                        ${Number(run.amount_paid).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Process Payroll — {format(new Date(), 'MMMM d, yyyy')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 pt-1">
                {confirmTargets.map((t) => (
                  <div
                    key={t.tutor_name}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {t.tutor_name}{' '}
                      <span className="text-muted-foreground">
                        ({t.unpaid_count} class
                        {t.unpaid_count !== 1 ? 'es' : ''},{' '}
                        {formatLastPaid(t.last_payment_date).toLowerCase()})
                      </span>
                    </span>
                    <span className="font-medium ml-4">
                      ${Number(t.total_owed).toFixed(2)}
                    </span>
                  </div>
                ))}
                {confirmTargets.length > 1 && (
                  <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
                    <span>Total</span>
                    <span>${selectedTotal.toFixed(2)}</span>
                  </div>
                )}
                <p className="text-muted-foreground text-xs pt-2">
                  All listed classes will be marked as paid with today's date.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm & Mark All Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TutorPaymentSummary;
