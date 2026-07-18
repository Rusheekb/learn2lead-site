import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingDown,
  Users,
  Link as LinkIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import TutorPaymentSummary from './class-logs/TutorPaymentSummary';
import StudentPaymentSummary from './class-logs/StudentPaymentSummary';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodayClass {
  id: string;
  title: string;
  subject: string;
  start_time: string;
  end_time: string;
  student: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  tutor: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

interface ZeroCreditRow {
  student_name: string;
  profile_id: string;
  email: string;
  credits_remaining: number;
  next_class_date: string;
  next_class_title: string;
}

interface AtRiskRow {
  student_name: string;
  profile_id: string;
  email: string;
  credits_remaining: number;
  last_class_date: string | null;
  days_since_class: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const displayName = (
  p: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null
) => {
  if (!p) return 'Unknown';
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ');
  return full || p.email;
};

const formatTime = (t: string) => {
  try {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return t;
  }
};

const today = new Date().toISOString().split('T')[0];

// ─── Component ────────────────────────────────────────────────────────────────

const AdminHomeView: React.FC<{ onAddCredits?: (name: string) => void }> = ({
  onAddCredits,
}) => {
  // Today's classes
  const { data: todayClasses = [], isLoading: loadingToday } = useQuery<
    TodayClass[]
  >({
    queryKey: ['admin-today-classes', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_classes')
        .select(
          `
          id, title, subject, start_time, end_time,
          student:profiles!scheduled_classes_student_id_fkey(first_name, last_name, email),
          tutor:profiles!scheduled_classes_tutor_id_fkey(first_name, last_name, email)
        `
        )
        .eq('date', today)
        .order('start_time');
      if (error) throw error;
      return (data as unknown as TodayClass[]) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // 0-credit students with upcoming sessions
  const { data: zeroCreditRows = [], isLoading: loadingZero } = useQuery<
    ZeroCreditRow[]
  >({
    queryKey: ['admin-zero-credit-upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_zero_credit_upcoming_students'
      );
      if (error) throw error;
      return (data as unknown as ZeroCreditRow[]) || [];
    },
    staleTime: 60_000,
  });

  // At-risk students
  const { data: atRiskRows = [], isLoading: loadingAtRisk } = useQuery<
    AtRiskRow[]
  >({
    queryKey: ['admin-at-risk-students'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_at_risk_students');
      if (error) throw error;
      return (data as unknown as AtRiskRow[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const criticalCount = zeroCreditRows.length;

  return (
    <div className="space-y-6">
      {/* ── Today's Schedule ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Today's Schedule
            {!loadingToday && (
              <span className="text-muted-foreground font-normal text-base ml-1">
                —{' '}
                {todayClasses.length === 0
                  ? 'no classes'
                  : `${todayClasses.length} class${todayClasses.length !== 1 ? 'es' : ''}`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingToday ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : todayClasses.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              No classes scheduled for today.
            </div>
          ) : (
            <div className="space-y-2">
              {todayClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {cls.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {displayName(cls.student)} with {displayName(cls.tutor)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                    {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Alerts: 0-credit upcoming ─────────────────────────────────────── */}
      {(loadingZero || zeroCreditRows.length > 0) && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-5 w-5" />
              No Credits — Session Coming Up
              {criticalCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {criticalCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingZero ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {zeroCreditRows.map((row) => (
                  <div
                    key={row.profile_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5"
                  >
                    <div>
                      <p className="text-sm font-medium">{row.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.next_class_title} on{' '}
                        {format(parseISO(row.next_class_date), 'EEE, MMM d')}
                      </p>
                    </div>
                    {onAddCredits && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="shrink-0"
                        onClick={() => onAddCredits(row.student_name)}
                      >
                        Add Credits
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Payment Summaries ─────────────────────────────────────────────── */}
      <TutorPaymentSummary onPaymentUpdated={() => {}} />
      <StudentPaymentSummary onAddCredits={(name) => onAddCredits?.(name)} />

      {/* ── At-risk Students ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-amber-500" />
            At-Risk Students
            <span className="text-muted-foreground font-normal text-base">
              — no class in 30+ days
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAtRisk ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : atRiskRows.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              All active students have had a class in the last 30 days.
            </div>
          ) : (
            <div className="space-y-2">
              {atRiskRows.map((row) => (
                <div
                  key={row.profile_id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {row.student_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.last_class_date
                        ? `Last class ${format(parseISO(row.last_class_date), 'MMM d, yyyy')} (${row.days_since_class} days ago)`
                        : 'No classes on record'}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700 dark:text-amber-400"
                  >
                    {row.credits_remaining} hr
                    {row.credits_remaining !== 1 ? 's' : ''} left
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                Reach out to re-engage these students before they churn.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quick link to full class logs ────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LinkIcon className="h-3.5 w-3.5" />
        <Link
          to="/admin-dashboard?tab=schedule"
          className="hover:underline text-primary"
        >
          View full class logs & payment details →
        </Link>
      </div>
    </div>
  );
};

export default AdminHomeView;
