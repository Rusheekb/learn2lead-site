import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

type PayrollTarget = TutorSummaryRow | 'all';

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
  const [payrollTarget, setPayrollTarget] = useState<PayrollTarget | null>(
    null
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: payrollHistory = [], refetch: refetchHistory } = useQuery<
    PayrollRun[]
  >({
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

  const confirmTargets: TutorSummaryRow[] =
    payrollTarget === 'all'
      ? tutorSummaries
      : payrollTarget
        ? [payrollTarget]
        : [];

  const handleConfirm = async () => {
    const classIds = confirmTargets.flatMap((t) => t.class_ids);
    const ok = await batchUpdateTutorPaymentDate(classIds, new Date());
    if (ok) {
      // Log each payroll run to the audit table
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
      queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tutor-payroll-history'] });
      onPaymentUpdated();
    } else {
      toast.error('Failed to process payroll');
    }
    setPayrollTarget(null);
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Tutor Payroll
              <span className="text-muted-foreground font-normal text-base">
                — Total owed: ${grandTotal.toFixed(2)}
              </span>
            </CardTitle>
            <Button onClick={() => setPayrollTarget('all')}>
              Process Payroll
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tutorSummaries.map((summary) => (
              <div
                key={summary.tutor_name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {summary.tutor_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {summary.unpaid_count} class
                    {summary.unpaid_count !== 1 ? 'es' : ''} ·{' '}
                    {formatLastPaid(summary.last_payment_date)}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                  <span className="text-lg font-bold whitespace-nowrap">
                    ${Number(summary.total_owed).toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPayrollTarget(summary)}
                    className="whitespace-nowrap"
                  >
                    Pay {summary.tutor_name.split(' ')[0]}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Payroll History */}
          <div className="mt-4 border-t pt-3">
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
        open={payrollTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPayrollTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {payrollTarget === 'all'
                ? 'Process Payroll'
                : `Pay ${confirmTargets[0]?.tutor_name}`}
              {' — '}
              {format(new Date(), 'MMMM d, yyyy')}
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
                    <span>
                      $
                      {confirmTargets
                        .reduce((s, t) => s + Number(t.total_owed), 0)
                        .toFixed(2)}
                    </span>
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
