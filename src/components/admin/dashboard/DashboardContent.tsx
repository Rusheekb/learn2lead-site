
import React from 'react';
import { TopPerformer } from '@/types/sharedTypes';
import AnalyticsMetricsGrid from '../analytics/AnalyticsMetricsGrid';
import TopPerformersGrid from '../analytics/TopPerformersGrid';
import PopularSubjectsTable from '../analytics/PopularSubjectsTable';
import MonthlyDistributionTable from '../analytics/MonthlyDistributionTable';
import { BusinessAnalytics } from '@/services/analyticsService';

interface DashboardContentProps {
  isLoading: boolean;
  businessAnalytics: BusinessAnalytics | null;
  topTutors: TopPerformer[];
  topStudents: TopPerformer[];
  monthlyClasses: Record<string, number>;
  popularSubjects: Array<{ subject: string; count: number }>;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  isLoading,
  businessAnalytics,
  topTutors,
  topStudents,
  monthlyClasses,
  popularSubjects,
}) => {
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

export default DashboardContent;
