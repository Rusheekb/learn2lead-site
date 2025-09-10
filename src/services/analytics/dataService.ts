import { supabase } from '@/integrations/supabase/client';
import { ClassEvent, ClassStatus, AttendanceStatus, isValidClassStatus, isValidAttendanceStatus } from '@/types/tutorTypes';

export interface ClassLogData {
  id: string;
  'Class Number': string | null;
  'Tutor Name': string | null;
  'Student Name': string | null;
  'Date': string;
  'Day': string | null;
  'Time (CST)': string | null;
  'Time (hrs)': string | null;
  'Subject': string | null;
  'Content': string | null;
  'HW': string | null;
  'Class ID': string | null;
  'Additional Info': string | null;
  'Student Payment': string | null;
  'Tutor Payment': string | null;
  'Class Cost': string | null;
  'Tutor Cost': string | null;
}

export interface ScheduledClassData {
  id: string;
  title: string;
  tutor_id: string;
  student_id: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  zoom_link: string | null;
  notes: string | null;
  status: string;
  attendance: string | null;
}

/**
 * Fetch all class logs from the database
 */
export async function fetchClassLogs(): Promise<ClassLogData[]> {
  try {
    const { data, error } = await supabase
      .from('class_logs')
      .select('*')
      .order('Date', { ascending: false });

    if (error) {
      console.error('Error fetching class logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchClassLogs:', error);
    return [];
  }
}

/**
 * Fetch all scheduled classes from the database
 */
export async function fetchScheduledClasses(): Promise<ScheduledClassData[]> {
  try {
    const { data, error } = await supabase
      .from('scheduled_classes')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled classes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchScheduledClasses:', error);
    return [];
  }
}

/**
 * Convert class logs and scheduled classes to ClassEvent format for analytics
 */
export function convertToClassEvents(
  classLogs: ClassLogData[], 
  scheduledClasses: ScheduledClassData[]
): ClassEvent[] {
  const events: ClassEvent[] = [];

  // Convert completed class logs
  classLogs.forEach(log => {
    if (!log.Date) return;

    const parseTime = (timeStr: string): [string, string] => {
      // Handle various time formats from the CSV
      if (timeStr.includes('-')) {
        const [start, end] = timeStr.split('-').map(t => t.trim());
        return [start, end];
      }
      return [timeStr, timeStr];
    };

    const [startTime, endTime] = parseTime(log['Time (CST)'] || '');

    const classEvent: ClassEvent = {
      id: log['Class ID'] || log.id,
      title: log['Class Number'] || 'Class',
      tutorId: '', // Not available in class logs
      tutorName: log['Tutor Name'] || '',
      studentId: '', // Not available in class logs
      studentName: log['Student Name'] || '',
      date: log.Date,
      startTime,
      endTime,
      subject: log.Subject || '',
      zoomLink: null,
      notes: log.Content || null,
      classCost: parseFloat(log['Class Cost'] || '0') || 0,
      tutorCost: parseFloat(log['Tutor Cost'] || '0') || 0,
      status: 'completed',
      homework: log.HW || undefined
    };

    events.push(classEvent);
  });

  // Convert scheduled classes (upcoming/in-progress)
  scheduledClasses.forEach(scheduled => {
    const classEvent: ClassEvent = {
      id: scheduled.id,
      title: scheduled.title,
      tutorId: scheduled.tutor_id,
      tutorName: '', // Will need to fetch from profiles if needed
      studentId: scheduled.student_id,
      studentName: '', // Will need to fetch from profiles if needed
      date: scheduled.date,
      startTime: scheduled.start_time,
      endTime: scheduled.end_time,
      subject: scheduled.subject,
      zoomLink: scheduled.zoom_link || null,
      notes: scheduled.notes || null,
      status: isValidClassStatus(scheduled.status) ? scheduled.status : 'scheduled',
      attendance: scheduled.attendance && isValidAttendanceStatus(scheduled.attendance) 
        ? scheduled.attendance 
        : undefined
    };

    events.push(classEvent);
  });

  return events;
}

/**
 * Fetch all analytics data (both completed and scheduled classes)
 */
export async function fetchAnalyticsData(): Promise<ClassEvent[]> {
  try {
    const [classLogs, scheduledClasses] = await Promise.all([
      fetchClassLogs(),
      fetchScheduledClasses()
    ]);

    return convertToClassEvents(classLogs, scheduledClasses);
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return [];
  }
}

/**
 * Get analytics data for a specific user (tutor or student)
 */
export async function fetchUserAnalyticsData(userId: string, role: 'tutor' | 'student'): Promise<ClassEvent[]> {
  try {
    // Fetch class logs based on name (since we don't have direct user ID mapping)
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (!profile) return [];

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const searchNames = [fullName, profile.email].filter(Boolean);

    // Fetch class logs
    let classLogsQuery = supabase.from('class_logs').select('*');
    
    if (role === 'tutor') {
      classLogsQuery = classLogsQuery.in('Tutor Name', searchNames);
    } else {
      classLogsQuery = classLogsQuery.in('Student Name', searchNames);
    }

    const { data: classLogs } = await classLogsQuery;

    // Fetch scheduled classes
    let scheduledQuery = supabase.from('scheduled_classes').select('*');
    
    if (role === 'tutor') {
      scheduledQuery = scheduledQuery.eq('tutor_id', userId);
    } else {
      scheduledQuery = scheduledQuery.eq('student_id', userId);
    }

    const { data: scheduledClasses } = await scheduledQuery;

    return convertToClassEvents(classLogs || [], scheduledClasses || []);
  } catch (error) {
    console.error('Error fetching user analytics data:', error);
    return [];
  }
}