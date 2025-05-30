
import { ClassEvent } from '@/types/tutorTypes';
import { parseNumericString } from '@/utils/numberUtils';

// Extend the EventName enum to include language change event
export enum EventName {
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  LINK_CLICK = 'link_click',
  FORM_SUBMIT = 'form_submit',
  TOGGLE_SIDEBAR = 'toggle_sidebar',
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

export interface BusinessAnalytics {
  totalRevenue: number;
  netIncome: number;
  studentRetentionRate: number;
  averageClassCost: number;
}

// New interface for user analytics
export interface UserAnalytics {
  totalSessions: number;
  avgDuration: number;
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

  calculateBusinessAnalytics(classes: ClassEvent[]): BusinessAnalytics {
    if (!classes || classes.length === 0) {
      return {
        totalRevenue: 0,
        netIncome: 0,
        studentRetentionRate: 0,
        averageClassCost: 0
      };
    }

    // Calculate total revenue (sum of all class costs)
    const totalRevenue = classes.reduce((sum, classEvent) => {
      return sum + (classEvent.classCost || 0);
    }, 0);

    // Calculate total tutor costs
    const totalTutorCosts = classes.reduce((sum, classEvent) => {
      return sum + (classEvent.tutorCost || 0);
    }, 0);

    // Net income is revenue minus tutor costs
    const netIncome = totalRevenue - totalTutorCosts;

    // Calculate average class cost
    const averageClassCost = classes.length > 0 ? totalRevenue / classes.length : 0;

    // Calculate student retention rate (percentage of students who attended more than one class)
    const studentCounts = new Map<string, number>();
    classes.forEach(classEvent => {
      if (classEvent.studentName) {
        const count = studentCounts.get(classEvent.studentName) || 0;
        studentCounts.set(classEvent.studentName, count + 1);
      }
    });

    const totalStudents = studentCounts.size;
    const returningStudents = Array.from(studentCounts.values()).filter(count => count > 1).length;
    const studentRetentionRate = totalStudents > 0 ? (returningStudents / totalStudents) * 100 : 0;

    return {
      totalRevenue,
      netIncome,
      studentRetentionRate,
      averageClassCost
    };
  }

  // Add the missing functions that are imported in UserDetailModal.tsx
  async fetchStudentAnalytics(studentId: string): Promise<UserAnalytics> {
    console.log(`Fetching analytics for student: ${studentId}`);
    // This would normally fetch data from an API or database
    // For now, return mock data
    return {
      totalSessions: Math.floor(Math.random() * 20) + 1, // 1-20 sessions
      avgDuration: Math.floor(Math.random() * 60) + 30 // 30-90 minutes
    };
  }

  async fetchTutorAnalytics(tutorId: string): Promise<UserAnalytics> {
    console.log(`Fetching analytics for tutor: ${tutorId}`);
    // This would normally fetch data from an API or database
    // For now, return mock data
    return {
      totalSessions: Math.floor(Math.random() * 50) + 10, // 10-60 sessions
      avgDuration: Math.floor(Math.random() * 45) + 45 // 45-90 minutes
    };
  }
}

export const analytics = new AnalyticsService();
export const fetchStudentAnalytics = (studentId: string) => analytics.fetchStudentAnalytics(studentId);
export const fetchTutorAnalytics = (tutorId: string) => analytics.fetchTutorAnalytics(tutorId);
