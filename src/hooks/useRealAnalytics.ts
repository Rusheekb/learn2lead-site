import { useState, useEffect, useMemo } from 'react';
import { fetchAnalyticsData } from '@/services/analytics/dataService';
import { useAnalytics } from './useAnalytics';
import { ClassEvent } from '@/types/tutorTypes';

/**
 * Hook that fetches real data from the database and provides analytics
 */
export const useRealAnalytics = () => {
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        setError(null);
        const analyticsData = await fetchAnalyticsData();
        setClasses(analyticsData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Use the existing analytics hook with real data
  const analytics = useAnalytics(classes);

  return {
    ...analytics,
    isLoading: isLoadingData || analytics.isLoading,
    error,
    totalClasses: classes.length,
    completedClasses: classes.filter(c => c.status === 'completed').length,
    upcomingClasses: classes.filter(c => c.status === 'scheduled').length,
    classes // Expose raw classes data if needed
  };
};

export default useRealAnalytics;