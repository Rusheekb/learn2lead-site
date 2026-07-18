import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface PayrollRun {
  id: string;
  paid_at: string;
  amount_paid: number;
  class_count: number;
  created_at: string;
}

const TutorEarningsHistory: React.FC = () => {
  const { data: runs = [], isLoading } = useQuery<PayrollRun[]>({
    queryKey: ['my-payroll-history'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_payroll_history');
      if (error) throw error;
      return (data as unknown as PayrollRun[]) || [];
    },
    staleTime: 5 * 60_000,
  });

  const totalEarned = runs.reduce((s, r) => s + Number(r.amount_paid), 0);
  const totalClasses = runs.reduce((s, r) => s + r.class_count, 0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No payroll runs recorded yet.</p>
          <p className="text-xs mt-1">
            Your admin will process payments after classes are completed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-xl font-bold">${totalEarned.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Classes Paid</p>
              <p className="text-xl font-bold">{totalClasses}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {format(parseISO(run.paid_at), 'MMMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {run.class_count} class{run.class_count !== 1 ? 'es' : ''}{' '}
                  paid
                </p>
              </div>
              <Badge
                variant="secondary"
                className="text-sm font-semibold tabular-nums"
              >
                ${Number(run.amount_paid).toFixed(2)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorEarningsHistory;
