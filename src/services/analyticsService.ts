
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
  classesCompleted: number;
  totalCredits: number;
  classesPaid: number;
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

    // Calculate total revenue (sum of all class costs) with proper number handling
    const totalRevenue = classes.reduce((sum, classEvent) => {
      const cost = typeof classEvent.classCost === 'number' ? classEvent.classCost : 
                   typeof classEvent.classCost === 'string' ? parseNumericString(classEvent.classCost) : 0;
      return sum + cost;
    }, 0);

    // Calculate total tutor costs with proper number handling
    const totalTutorCosts = classes.reduce((sum, classEvent) => {
      const cost = typeof classEvent.tutorCost === 'number' ? classEvent.tutorCost : 
                   typeof classEvent.tutorCost === 'string' ? parseNumericString(classEvent.tutorCost) : 0;
      return sum + cost;
    }, 0);

    // Net income is revenue minus tutor costs
    const netIncome = totalRevenue - totalTutorCosts;

    // Calculate average class cost
    const averageClassCost = classes.length > 0 ? totalRevenue / classes.length : 0;

    // Calculate student retention rate (percentage of students who attended more than one class)
    const studentCounts = new Map<string, number>();
    classes.forEach(classEvent => {
      // Only count valid student names (non-empty and not 'Unknown Student')
      if (classEvent.studentName && 
          classEvent.studentName.trim() && 
          classEvent.studentName !== 'Unknown Student') {
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
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get profile to match student name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', studentId)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching student profile:', profileError);
        return { classesCompleted: 0, totalCredits: 0, classesPaid: 0 };
      }

      // Construct full name or fallback to email
      const fullName = profile.first_name && profile.last_name 
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : profile.email;

      // Count completed classes from class_logs with proper escaping
      const escapedFullName = fullName.replace(/"/g, '""');
      const escapedEmail = profile.email.replace(/"/g, '""');
      
      const { data: classLogs, error: logsError } = await supabase
        .from('class_logs')
        .select('id')
        .or(`"Student Name".eq."${escapedFullName}","Student Name".eq."${escapedEmail}"`);

      const classesCompleted = logsError || !classLogs ? 0 : classLogs.length;

      // Get total credits (remaining) from class_credits_ledger
      const { data: ledger } = await supabase
        .from('class_credits_ledger')
        .select('balance_after')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const totalCredits = ledger?.balance_after ?? 0;

      // Get total credits ever allocated (sum of positive credit amounts)
      const { data: creditEntries } = await supabase
        .from('class_credits_ledger')
        .select('amount')
        .eq('student_id', studentId)
        .eq('transaction_type', 'credit');

      const classesPaid = creditEntries 
        ? creditEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
        : 0;

      return {
        classesCompleted,
        totalCredits,
        classesPaid
      };
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      return { classesCompleted: 0, totalCredits: 0, classesPaid: 0 };
    }
  }

  async fetchTutorAnalytics(tutorId: string): Promise<UserAnalytics> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get profile to match tutor name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', tutorId)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching tutor profile:', profileError);
        return { classesCompleted: 0, totalCredits: 0, classesPaid: 0 };
      }

      // Construct full name or fallback to email
      const fullName = profile.first_name && profile.last_name 
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : profile.email;

      // Count completed classes from class_logs with proper escaping
      // Escape double quotes in values to prevent SQL injection
      const escapedFullName = fullName.replace(/"/g, '""');
      const escapedEmail = profile.email.replace(/"/g, '""');
      
      const { data: classLogs, error: logsError } = await supabase
        .from('class_logs')
        .select('id')
        .or(`"Tutor Name".eq."${escapedFullName}","Tutor Name".eq."${escapedEmail}"`);

      const classesCompleted = logsError || !classLogs ? 0 : classLogs.length;

      // Tutors don't have credits, so return 0
      return {
        classesCompleted,
        totalCredits: 0,
        classesPaid: 0
      };
    } catch (error) {
      console.error('Error fetching tutor analytics:', error);
      return { classesCompleted: 0, totalCredits: 0, classesPaid: 0 };
    }
  }
}

export const analytics = new AnalyticsService();
export const fetchStudentAnalytics = (studentId: string) => analytics.fetchStudentAnalytics(studentId);
export const fetchTutorAnalytics = (tutorId: string) => analytics.fetchTutorAnalytics(tutorId);
