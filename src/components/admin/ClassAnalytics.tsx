
import React from 'react';
import { useClassLogs } from '@/hooks/useClassLogs';
import { useAnalytics } from '@/hooks/useAnalytics';
import AnalyticsMetricsGrid from './analytics/AnalyticsMetricsGrid';
import TopPerformersGrid from './analytics/TopPerformersGrid';
import PopularSubjectsTable from './analytics/PopularSubjectsTable';
import MonthlyDistributionTable from './analytics/MonthlyDistributionTable';
import WeeklyClassesChart from './analytics/WeeklyClassesChart';
import { TopPerformer } from '@/types/sharedTypes';

const ClassAnalytics: React.FC = () => {
  const { classes, isLoading: isLoadingClasses } = useClassLogs();
  const {
    isLoading: isLoadingAnalytics,
    businessAnalytics,
    getTopPerformingTutors,
    getTopPerformingStudents,
    getRevenueByMonth,
    getSubjectPopularity,
    weeklyClasses
  } = useAnalytics(classes);

  const isLoading = isLoadingClasses || isLoadingAnalytics;

  // Explicitly cast to TopPerformer[] to ensure type safety
  const topTutors: TopPerformer[] = getTopPerformingTutors('totalClasses');
  const topStudents: TopPerformer[] = getTopPerformingStudents('totalClasses');
  const monthlyClasses = getRevenueByMonth();
  const popularSubjects = getSubjectPopularity();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold">Learning Analytics</h2>
        <div className="flex justify-center items-center py-12">
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Learning Analytics</h2>

      <AnalyticsMetricsGrid
        isLoading={isLoading}
        businessAnalytics={businessAnalytics}
      />

      {/* Weekly Classes Chart */}
      <WeeklyClassesChart data={weeklyClasses} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPerformersGrid topTutors={topTutors} topStudents={topStudents} />

        <div className="grid gap-6">
          <PopularSubjectsTable popularSubjects={popularSubjects} />
          <MonthlyDistributionTable monthlyClasses={monthlyClasses} />
        </div>
      </div>
    </div>
  );
};

export default ClassAnalytics;
