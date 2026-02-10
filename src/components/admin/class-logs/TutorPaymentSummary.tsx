import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { batchUpdateTutorPaymentDate } from '@/services/class-operations/update/updatePaymentDate';
import { DollarSign, CheckCircle2 } from 'lucide-react';

interface TutorPaymentSummaryProps {
  classes: ClassEvent[];
  onPaymentUpdated: () => void;
}

interface TutorSummary {
  tutorName: string;
  unpaidClasses: ClassEvent[];
  totalOwed: number;
}

const TutorPaymentSummary: React.FC<TutorPaymentSummaryProps> = ({
  classes,
  onPaymentUpdated,
}) => {
  const tutorSummaries = useMemo(() => {
    const map = new Map<string, TutorSummary>();

    classes.forEach((cls) => {
      if (cls.tutorPaymentDate || !cls.tutorName) return;
      const name = cls.tutorName;
      const existing = map.get(name) || {
        tutorName: name,
        unpaidClasses: [],
        totalOwed: 0,
      };
      existing.unpaidClasses.push(cls);
      existing.totalOwed += cls.tutorCost || 0;
      map.set(name, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalOwed - a.totalOwed);
  }, [classes]);

  const handleMarkAllPaid = async (summary: TutorSummary) => {
    const ids = summary.unpaidClasses.map((c) => c.id);
    const ok = await batchUpdateTutorPaymentDate(ids, new Date());
    if (ok) {
      toast.success(
        `Marked ${ids.length} classes as paid for ${summary.tutorName}`
      );
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
              key={summary.tutorName}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
            >
              <div>
                <div className="font-medium">{summary.tutorName}</div>
                <div className="text-sm text-muted-foreground">
                  {summary.unpaidClasses.length} unpaid class
                  {summary.unpaidClasses.length !== 1 ? 'es' : ''}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">
                  ${summary.totalOwed.toFixed(2)}
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
