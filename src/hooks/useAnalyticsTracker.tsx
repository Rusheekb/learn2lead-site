
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { analytics, EventName, EventCategory } from '@/services/analytics/analyticsService';

/**
 * Hook to initialize analytics and provide tracking methods
 */
export function useAnalyticsTracker() {
  const { user, userRole } = useAuth();
  
  // Initialize analytics with user data when available
  useEffect(() => {
    if (user) {
      // Instead of calling a non-existent init method, we'll track a user identification event
      analytics.track({
        category: EventCategory.AUTH,
        name: EventName.PAGE_VIEW,
        properties: {
          userId: user.id,
          userRole: userRole,
          event: 'user_identified'
        }
      });
    }
  }, [user, userRole]);
  
  /**
   * Track a UI interaction event
   */
  const trackUI = (name: EventName, properties?: Record<string, any>) => {
    analytics.track({
      category: EventCategory.UI,
      name,
      properties,
    });
  };
  
  /**
   * Track a navigation event
   */
  const trackNavigation = (name: EventName, properties?: Record<string, any>) => {
    analytics.track({
      category: EventCategory.NAVIGATION,
      name,
      properties,
    });
  };
  
  /**
   * Track a class management event
   */
  const trackClass = (name: EventName, properties?: Record<string, any>) => {
    analytics.track({
      category: EventCategory.CLASS,
      name,
      properties,
    });
  };
  
  /**
   * Track a page view
   */
  const trackPageView = (page: string) => {
    analytics.track({
      category: EventCategory.NAVIGATION,
      name: EventName.PAGE_VIEW,
      properties: { page },
    });
  };
  
  /**
   * Track a tab change
   */
  const trackTabChange = (fromTab: string, toTab: string) => {
    analytics.track({
      category: EventCategory.NAVIGATION,
      name: EventName.TAB_CHANGE,
      properties: { fromTab, toTab },
    });
  };
  
  return {
    trackUI,
    trackNavigation,
    trackClass,
    trackPageView,
    trackTabChange,
  };
}
