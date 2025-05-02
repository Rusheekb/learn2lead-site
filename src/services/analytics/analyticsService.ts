// Extend the EventName enum to include language change event
export enum EventName {
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  LINK_CLICK = 'link_click',
  FORM_SUBMIT = 'form_submit',
  TOGGLE_SIDEBAR = 'toggle_sidebar',
  TOGGLE_THEME = 'toggle_theme',
  LANGUAGE_CHANGE = 'language_change',
  TAB_CHANGE = 'tab_change',
  CLASS_CREATED = 'class_created',
  CLASS_EDITED = 'class_edited',
  CLASS_DELETED = 'class_deleted'
}

export enum EventCategory {
  NAVIGATION = 'navigation',
  INTERACTION = 'interaction',
  UI = 'ui',
  CLASS = 'class',
  AUTH = 'auth'
}

export interface AnalyticsEvent {
  category: EventCategory;
  name: EventName;
  properties?: Record<string, any>;
}

class AnalyticsService {
  track(event: AnalyticsEvent): void {
    console.log(`[Analytics] ${event.category} - ${event.name}`, event.properties);
    
    // Implement actual analytics tracking here (e.g., Segment, Google Analytics)
    // Example: window.analytics.track(event.name, { category: event.category, ...event.properties });
  }

  page(pageName: string, properties?: Record<string, any>): void {
    console.log(`[Analytics] Page View: ${pageName}`, properties);
    
    // Example: window.analytics.page(pageName, properties);
  }
}

export const analytics = new AnalyticsService();
