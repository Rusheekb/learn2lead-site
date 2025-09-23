import { useCallback, useMemo } from 'react';

export const usePerformance = () => {
  // Stable callback for common operations
  const memoizedCallback = useCallback((fn: () => void) => {
    return fn;
  }, []);

  // Debounced search functionality
  const createDebouncedSearch = useCallback((searchFn: (query: string) => void, delay = 300) => {
    let timeoutId: NodeJS.Timeout;
    
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => searchFn(query), delay);
    };
  }, []);

  // Memoized data filtering
  const createMemoizedFilter = useCallback(<T>(
    data: T[], 
    filterFn: (item: T) => boolean,
    dependencies: any[]
  ) => {
    return useMemo(() => data.filter(filterFn), [data, ...dependencies]);
  }, []);

  return {
    memoizedCallback,
    createDebouncedSearch,
    createMemoizedFilter,
  };
};

// Performance monitoring hook
export const useWebVitals = () => {
  const trackPerformance = useCallback((metricName: string, value: number) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${metricName}-${value}`);
      console.log(`Performance metric: ${metricName} = ${value}ms`);
    }
  }, []);

  return { trackPerformance };
};