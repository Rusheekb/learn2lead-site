
import { useState, useEffect, useMemo } from 'react';
import { useClassLogs } from '@/hooks/useClassLogs';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TopPerformer, PopularSubject } from '@/types/sharedTypes';

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
    monthlyClasses: {} as Record<string, number>,
    popularSubjects: [] as PopularSubject[]
  });

  const isLoading = isLoadingClasses || isLoadingAnalytics;
  
  // Cache calculated values when data is loaded to prevent recalculations
  useEffect(() => {
    if (!isLoading && classes.length > 0) {
      const revenueByMonth = getRevenueByMonth();
      
      setCachedData({
        topTutors: getTopPerformingTutors('totalClasses').map(item => ({
          name: item.name,
          value: typeof item.value === 'number' ? item.value : 0
        })),
        topStudents: getTopPerformingStudents('totalClasses').map(item => ({
          name: item.name,
          value: typeof item.value === 'number' ? item.value : 0
        })),
        // Store as Record<string, number> directly rather than an array of objects
        monthlyClasses: revenueByMonth,
        popularSubjects: getSubjectPopularity()
      });
    }
  }, [isLoading, classes.length, getTopPerformingTutors, getTopPerformingStudents, getRevenueByMonth, getSubjectPopularity]);

  return {
    isLoading,
    businessAnalytics,
    topTutors: cachedData.topTutors,
    topStudents: cachedData.topStudents,
    monthlyClasses: cachedData.monthlyClasses,
    popularSubjects: cachedData.popularSubjects,
  };
};
