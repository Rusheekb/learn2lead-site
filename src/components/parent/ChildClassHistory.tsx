import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertCircle, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatHours } from '@/lib/hours';

interface ChildClassHistoryProps {
  studentId: string;
}

interface ChildClassLog {
  id: string;
  date: string | null;
  subject: string | null;
  tutorName: string | null;
  hours: string | null;
  content: string | null;
  homework: string | null;
}

async function fetchChildClassLogs(
  studentId: string
): Promise<ChildClassLog[]> {
  // RLS limits a parent to their own children's logs.
  const { data, error } = await supabase
    .from('class_logs')
    .select(
      'id, "Date", "Subject", "Tutor Name", "Time (hrs)", "Content", "HW"'
    )
    .eq('student_user_id', studentId)
    .order('Date', { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data ?? []).map((l) => ({
    id: l.id,
    date: l.Date,
    subject: l.Subject,
    tutorName: l['Tutor Name'],
    hours: l['Time (hrs)'],
    content: l.Content,
    homework: l.HW,
  }));
}

/** Completed classes with the tutor's notes and homework, newest first. */
const ChildClassHistory: React.FC<ChildClassHistoryProps> = ({ studentId }) => {
  const {
    data: logs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['family', 'child-class-logs', studentId],
    queryFn: () => fetchChildClassLogs(studentId),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Class history
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Couldn’t load class history.
          </p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed classes yet. Notes and homework from each class will
            appear here.
          </p>
        ) : (
          <ul className="divide-y">
            {logs.map((log) => {
              const hours = Number(log.hours);
              return (
                <li key={log.id} className="py-3 space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {log.subject || 'Class'}
                      {log.tutorName ? (
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          with {log.tutorName}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.date ? format(parseISO(log.date), 'EEE, MMM d') : ''}
                      {Number.isFinite(hours) && hours > 0
                        ? ` · ${formatHours(hours)}`
                        : ''}
                    </p>
                  </div>
                  {log.content && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Covered: </span>
                      {log.content}
                    </p>
                  )}
                  {log.homework && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Homework: </span>
                      {log.homework}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ChildClassHistory;
