
// This is a simple analytics service that can be extended to work with Segment, GA, etc.
// Currently, it just logs to console but can be modified to send events to any provider

/**
 * Analytics event categories
 */
export enum EventCategory {
  UI = 'ui_interaction',
  NAVIGATION = 'navigation',
  CLASS = 'class_management',
  USER = 'user_management',
}

/**
 * Analytics event names
 */
export enum EventName {
  // UI events
  TOGGLE_DARK_MODE = 'toggle_dark_mode',
  TOGGLE_SIDEBAR = 'toggle_sidebar',
  
  // Navigation events
  TAB_CHANGE = 'tab_change',
  PAGE_VIEW = 'page_view',
  
  // Class management events
  CLASS_CREATED = 'class_created',
  CLASS_EDITED = 'class_edited',
  CLASS_DELETED = 'class_deleted',
  CLASS_COMPLETED = 'class_completed',
  
  // User events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  PROFILE_UPDATED = 'profile_updated',
}

interface AnalyticsEvent {
  category: EventCategory;
  name: EventName;
  properties?: Record<string, any>;
}

/**
 * Core analytics service
 * This can be extended to integrate with actual analytics providers
 */
class AnalyticsService {
  private enabled = true;
  private userId: string | null = null;
  private userRole: string | null = null;
  
  /**
   * Initialize the analytics service with user information
   */
  public init(userId: string | null, userRole: string | null): void {
    this.userId = userId;
    this.userRole = userRole;
    console.log('Analytics initialized', { userId, userRole });
  }
  
  /**
   * Track an event
   */
  public track(event: AnalyticsEvent): void {
    if (!this.enabled) return;
    
    const eventData = {
      ...event,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      userRole: this.userRole,
    };
    
    // In production, this would send to an actual analytics service
    console.log('📊 Analytics Event:', eventData);
    
    // Uncomment and modify this section to integrate with Segment, GA, etc.
    /*
    if (window.analytics) {
      window.analytics.track(event.name, {
        ...event.properties,
        category: event.category,
        userId: this.userId,
        userRole: this.userRole,
      });
    }
    */
  }
  
  /**
   * Enable or disable analytics
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create and export a singleton instance
export const analytics = new AnalyticsService();

// Helper functions for common events
export const trackUIEvent = (
  name: EventName, 
  properties?: Record<string, any>
) => {
  analytics.track({
    category: EventCategory.UI,
    name,
    properties,
  });
};

export const trackNavigationEvent = (
  name: EventName, 
  properties?: Record<string, any>
) => {
  analytics.track({
    category: EventCategory.NAVIGATION,
    name,
    properties,
  });
};

export const trackClassEvent = (
  name: EventName, 
  properties?: Record<string, any>
) => {
  analytics.track({
    category: EventCategory.CLASS,
    name,
    properties,
  });
};
