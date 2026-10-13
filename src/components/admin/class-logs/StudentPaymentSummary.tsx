import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { classLogsKeys } from '@/hooks/useClassLogs';
import { format, parseISO } from 'date-fns';

interface StudentCreditRow {
  student_name: string;
  profile_id: string;
  credits: number;
  last_class_date: string | null;
}

function creditBadgeVariant(credits: number) {
  if (credits === 0) return 'destructive';
  return 'secondary'; // 1–2 credits → amber-ish secondary
}

function formatLastClass(date: string | null): string {
  if (!date) return 'No classes yet';
  try {
    return `Last class ${format(parseISO(date), 'MMM d, yyyy')}`;
  } catch {
    return 'Last class unknown';
  }
}

const StudentPaymentSummary: React.FC = () => {
  const { data: rows = [], isError } = useQuery<StudentCreditRow[]>({
    queryKey: [...classLogsKeys.all, 'student-credit-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_students_credit_summary');
      if (error) throw error;
      return (data as unknown as StudentCreditRow[]) || [];
    },
    staleTime: 30_000,
  });

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm">Could not load hours summary.</p>
          <p className="text-xs mt-1">
            Push the latest migrations to Supabase to enable this feature.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
          All students have 3+ hours remaining.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Student Hours
          <span className="text-muted-foreground font-normal text-base">
            — {rows.length} student{rows.length !== 1 ? 's' : ''} running low
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.profile_id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg border border-border bg-muted/30"
            >
              <div className="min-w-0">
                <span className="font-medium truncate">{row.student_name}</span>
                <div className="text-sm text-muted-foreground">
                  {formatLastClass(row.last_class_date)}
                </div>
              </div>
              <Badge
                variant={creditBadgeVariant(Number(row.credits))}
                className={
                  Number(row.credits) > 0
                    ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                    : ''
                }
              >
                {Number(row.credits)} hr{Number(row.credits) !== 1 ? 's' : ''}{' '}
                left
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentPaymentSummary;
