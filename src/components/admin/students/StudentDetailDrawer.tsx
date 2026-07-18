import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, CalendarDays, CreditCard, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import type { Student } from './StudentTable';

interface RecentClass {
  id: string;
  Date: string;
  Subject: string | null;
  'Tutor Name': string | null;
  Content: string | null;
}

interface NextClass {
  id: string;
  title: string;
  date: string;
  start_time: string;
  subject: string | null;
  tutor_name: string | null;
}

interface StudentDetailDrawerProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function creditBadge(credits: number | null | undefined) {
  if (credits == null)
    return <span className="text-muted-foreground text-sm">—</span>;
  if (credits === 0) return <Badge variant="destructive">{credits} hrs</Badge>;
  if (credits <= 2)
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
        {credits} hr{credits !== 1 ? 's' : ''}
      </Badge>
    );
  return (
    <Badge variant="secondary">
      {credits} hr{credits !== 1 ? 's' : ''}
    </Badge>
  );
}

function safeFmt(date: string | null | undefined, fmt: string) {
  if (!date) return null;
  try {
    return format(parseISO(date), fmt);
  } catch {
    return date;
  }
}

const StudentDetailDrawer: React.FC<StudentDetailDrawerProps> = ({
  student,
  open,
  onOpenChange,
}) => {
  const { data: recentClasses = [], isLoading: loadingHistory } = useQuery<
    RecentClass[]
  >({
    queryKey: ['student-detail-history', student?.name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_logs')
        .select('id, Date, Subject, "Tutor Name", Content')
        .eq('Student Name', student!.name)
        .order('Date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data as RecentClass[]) || [];
    },
    enabled: open && !!student?.name,
    staleTime: 2 * 60_000,
  });

  const { data: nextClass, isLoading: loadingNext } =
    useQuery<NextClass | null>({
      queryKey: ['student-detail-next', student?.profileId],
      queryFn: async () => {
        if (!student?.profileId) return null;
        const { data, error } = await supabase
          .from('scheduled_classes')
          .select(
            'id, title, date, start_time, subject, tutor:profiles!tutor_id(first_name,last_name)'
          )
          .eq('student_id', student.profileId)
          .gte('date', new Date().toISOString().slice(0, 10))
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const t = data.tutor as {
          first_name: string | null;
          last_name: string | null;
        } | null;
        const tutor_name = t
          ? [t.first_name, t.last_name].filter(Boolean).join(' ') || null
          : null;
        return {
          id: data.id,
          title: data.title,
          date: data.date,
          start_time: data.start_time,
          subject: data.subject,
          tutor_name,
        };
      },
      enabled: open && !!student?.profileId,
      staleTime: 2 * 60_000,
    });

  if (!student) return null;

  const statusColor =
    student.status !== 'active'
      ? 'bg-muted-foreground/40'
      : (student.creditsRemaining ?? 0) === 0
        ? 'bg-destructive'
        : (student.creditsRemaining ?? 0) <= 2
          ? 'bg-amber-400'
          : 'bg-emerald-500';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor}`}
            />
            {student.name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Contact info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{student.email}</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  Credits
                </div>
                {creditBadge(student.creditsRemaining)}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  Rate
                </div>
                <span className="text-sm font-medium">
                  {student.classRate != null
                    ? `$${Number(student.classRate).toFixed(2)}/hr`
                    : '—'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Next class */}
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Next Scheduled Class
              </div>
              {loadingNext ? (
                <Skeleton className="h-4 w-32" />
              ) : nextClass ? (
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    {nextClass.subject || nextClass.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {safeFmt(nextClass.date, 'MMM d, yyyy')}
                    {nextClass.start_time &&
                      ` · ${nextClass.start_time.slice(0, 5)}`}
                    {nextClass.tutor_name && ` · ${nextClass.tutor_name}`}
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  None scheduled
                </span>
              )}
            </CardContent>
          </Card>

          {/* Recent class history */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Recent Classes
            </div>
            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No completed classes yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 rounded-lg border bg-muted/20 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {cls.Subject && (
                        <Badge variant="outline" className="text-xs">
                          {cls.Subject}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {safeFmt(cls.Date, 'MMM d, yyyy')}
                      </span>
                    </div>
                    {cls['Tutor Name'] && (
                      <div className="text-xs text-muted-foreground">
                        with {cls['Tutor Name']}
                      </div>
                    )}
                    {cls.Content && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {cls.Content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="text-xs text-muted-foreground text-center">
              Last class:{' '}
              {safeFmt(student.lastSession, 'MMM d, yyyy') || 'Never'}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default StudentDetailDrawer;
