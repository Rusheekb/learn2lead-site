
import { useState, useEffect } from 'react';
import { useClassLogs } from '@/hooks/useClassLogs';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TopPerformer } from '@/types/sharedTypes';

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

  const [cachedData, setCachedData] = useState({
    topTutors: [] as TopPerformer[],
    topStudents: [] as TopPerformer[],
    monthlyClasses: [] as any[],
    popularSubjects: [] as any[]
  });

  const isLoading = isLoadingClasses || isLoadingAnalytics;
  
  // Cache calculated values when data is loaded to prevent recalculations
  useEffect(() => {
    if (!isLoading && classes.length > 0) {
      setCachedData({
        topTutors: getTopPerformingTutors('totalClasses').map(item => ({
          name: item.name,
          value: typeof item.value === 'number' ? item.value : 0
        })),
        topStudents: getTopPerformingStudents('totalClasses').map(item => ({
          name: item.name,
          value: typeof item.value === 'number' ? item.value : 0
        })),
        monthlyClasses: getRevenueByMonth(),
        popularSubjects: getSubjectPopularity()
      });
    }
  }, [isLoading, classes.length]);

  return {
    isLoading,
    businessAnalytics,
    topTutors: cachedData.topTutors,
    topStudents: cachedData.topStudents,
    monthlyClasses: cachedData.monthlyClasses,
    popularSubjects: cachedData.popularSubjects,
  };
};
