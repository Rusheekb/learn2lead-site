
import React from 'react';
import { useClassLogs } from '@/hooks/useClassLogs';
import { useAnalytics } from '@/hooks/useAnalytics';

// Import components
import AnalyticsMetricsGrid from './analytics/AnalyticsMetricsGrid';
import TopPerformersGrid from './analytics/TopPerformersGrid';
import PopularSubjectsTable from './analytics/PopularSubjectsTable';
import MonthlyDistributionTable from './analytics/MonthlyDistributionTable';

const Dashboard: React.FC = () => {
  const { classes, isLoading: isLoadingClasses } = useClassLogs();
  const {
    isLoading: isLoadingAnalytics,
    businessAnalytics,
    getTopPerformingTutors,
    getTopPerformingStudents,
    getRevenueByMonth,
    getSubjectPopularity,
  } = useAnalytics(classes);

  const isLoading = isLoadingClasses || isLoadingAnalytics;
  const topTutors = getTopPerformingTutors('totalClasses');
  const topStudents = getTopPerformingStudents('totalClasses');
  const monthlyClasses = getRevenueByMonth();
  const popularSubjects = getSubjectPopularity();

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <AnalyticsMetricsGrid 
        isLoading={isLoading} 
        businessAnalytics={businessAnalytics} 
      />

      {/* Top Performers */}
      <TopPerformersGrid 
        topTutors={topTutors} 
        topStudents={topStudents} 
      />

      {/* Popular Subjects */}
      <PopularSubjectsTable 
        popularSubjects={popularSubjects} 
      />

      {/* Monthly Distribution */}
      <MonthlyDistributionTable 
        monthlyClasses={monthlyClasses} 
      />
    </div>
  );
};

export default Dashboard;
