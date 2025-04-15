
import { useClassLogs } from '@/hooks/useClassLogs';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TopPerformer } from '@/types/sharedTypes';
import { BusinessAnalytics } from '@/services/analyticsService';

export const useDashboardData = () => {
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
  
  // Ensure we're converting the returned values to match our TopPerformer type
  const topTutors = getTopPerformingTutors('totalClasses').map(item => ({
    name: item.name,
    value: typeof item.value === 'number' ? item.value : 0
  }));
  
  const topStudents = getTopPerformingStudents('totalClasses').map(item => ({
    name: item.name,
    value: typeof item.value === 'number' ? item.value : 0
  }));
  
  const monthlyClasses = getRevenueByMonth();
  const popularSubjects = getSubjectPopularity();

  return {
    isLoading,
    businessAnalytics,
    topTutors,
    topStudents,
    monthlyClasses,
    popularSubjects,
  };
};
