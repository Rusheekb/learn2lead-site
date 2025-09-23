import { useEffect } from 'react';

// Performance monitoring component to track Web Vitals
const PerformanceMonitor = () => {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') return;

    // Track Core Web Vitals (simplified without web-vitals library)
    const trackWebVitals = () => {
      try {
        // Basic performance tracking using built-in APIs
        if ('performance' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              console.log(`Performance: ${entry.name} = ${entry.duration}ms`);
            }
          });
          
          // Observe different types of performance entries
          try {
            observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
          } catch (e) {
            console.log('Performance Observer not fully supported');
          }
        }
      } catch (error) {
        console.log('Performance tracking not available');
      }
    };

    trackWebVitals();

    // Track navigation performance
    const trackNavigation = () => {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const navigation = navigationEntries[0];
          console.log('Page Load Time:', navigation.loadEventEnd - navigation.fetchStart);
          console.log('DOM Content Loaded:', navigation.domContentLoadedEventEnd - navigation.fetchStart);
        }
      }
    };

    // Small delay to ensure page is loaded
    setTimeout(trackNavigation, 1000);
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;