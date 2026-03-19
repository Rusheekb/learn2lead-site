import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalClasses: number;
  activeStudents: number;
  activeTutors: number;
  avgDurationMin: number | null;
}

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const [classesRes, studentsRes, tutorsRes, durationRes] = await Promise.all([
    supabase.from('class_logs').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('class_logs').select('"Time (hrs)"'),
  ]);

  if (classesRes.error) throw classesRes.error;
  if (studentsRes.error) throw studentsRes.error;
  if (tutorsRes.error) throw tutorsRes.error;
  if (durationRes.error) throw durationRes.error;

  // Calculate average duration in minutes from "Time (hrs)" column
  let avgDurationMin: number | null = null;
  if (durationRes.data && durationRes.data.length > 0) {
    const validHours = durationRes.data
      .map(row => parseFloat(row['Time (hrs)'] || ''))
      .filter(h => !isNaN(h) && h > 0);
    if (validHours.length > 0) {
      const avgHours = validHours.reduce((sum, h) => sum + h, 0) / validHours.length;
      avgDurationMin = Math.round(avgHours * 60);
    }
  }

  return {
    totalClasses: classesRes.count ?? 0,
    activeStudents: studentsRes.count ?? 0,
    activeTutors: tutorsRes.count ?? 0,
    avgDurationMin,
  };
};

const StatValue: React.FC<{ isLoading: boolean; value: string }> = ({ isLoading, value }) =>
  isLoading ? (
    <Skeleton className="h-7 w-16 sm:h-8 sm:w-20" />
  ) : (
    <div className="text-xl sm:text-2xl font-bold">{value}</div>
  );

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const cards = [
    { title: 'Total Classes', value: String(stats?.totalClasses ?? 0) },
    { title: 'Active Students', value: String(stats?.activeStudents ?? 0) },
    { title: 'Active Tutors', value: String(stats?.activeTutors ?? 0) },
    { title: 'Avg. Class Duration', value: stats?.avgDurationMin != null ? `${stats.avgDurationMin} min` : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <StatValue isLoading={isLoading} value={card.value} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

Dashboard.displayName = 'AdminDashboard';

export default React.memo(Dashboard);
