import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { batchUpdateTutorPaymentDate } from '@/services/class-operations/update/updatePaymentDate';
import { DollarSign, CheckCircle2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { classLogsKeys } from '@/hooks/useClassLogs';

interface TutorPaymentSummaryProps {
  onPaymentUpdated: () => void;
}

interface TutorSummaryRow {
  tutor_name: string;
  unpaid_count: number;
  total_owed: number;
  class_ids: string[];
}

const TutorPaymentSummary: React.FC<TutorPaymentSummaryProps> = ({
  onPaymentUpdated,
}) => {
  const queryClient = useQueryClient();

  const { data: tutorSummaries = [] } = useQuery<TutorSummaryRow[]>({
    queryKey: [...classLogsKeys.all, 'tutor-unpaid-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tutor_unpaid_summary');
      if (error) throw error;
      return (data as TutorSummaryRow[]) || [];
    },
    staleTime: 30_000,
  });

  const handleMarkAllPaid = async (summary: TutorSummaryRow) => {
    const ok = await batchUpdateTutorPaymentDate(summary.class_ids, new Date());
    if (ok) {
      toast.success(
        `Marked ${summary.unpaid_count} classes as paid for ${summary.tutor_name}`
      );
      queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
      onPaymentUpdated();
    } else {
      toast.error('Failed to update tutor payments');
    }
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Tutor Payouts Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tutorSummaries.map((summary) => (
            <div
              key={summary.tutor_name}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
            >
              <div>
                <div className="font-medium">{summary.tutor_name}</div>
                <div className="text-sm text-muted-foreground">
                  {summary.unpaid_count} unpaid class
                  {summary.unpaid_count !== 1 ? 'es' : ''}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">
                  ${Number(summary.total_owed).toFixed(2)}
                </span>
                <Button
                  size="sm"
                  onClick={() => handleMarkAllPaid(summary)}
                >
                  Mark All Paid
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TutorPaymentSummary;
