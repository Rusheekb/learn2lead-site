
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClassEvent, isValidClassStatus, isValidAttendanceStatus } from '@/types/tutorTypes';
import { parseTime24to12 } from '@/utils/dateTimeUtils';
import { Profile } from './types';

export const fetchScheduledClasses = async (
  tutorId?: string,
  studentId?: string
): Promise<ClassEvent[]> => {
  try {
    let query = supabase.from('scheduled_classes').select(`
      *,
      tutor:profiles!tutor_id(first_name, last_name),
      student:profiles!student_id(first_name, last_name)
    `);

    // Filter by tutor_id if provided - this is crucial for security and performance
    if (tutorId) {
      query = query.eq('tutor_id', tutorId);
      console.log(`Filtering classes by tutor_id: ${tutorId}`);
    }

    // Filter by student_id if provided
    if (studentId) {
      query = query.eq('student_id', studentId);
      console.log(`Filtering classes by student_id: ${studentId}`);
    }

    // If neither filter is provided, warn about this (should be rare)
    if (!tutorId && !studentId) {
      console.warn('No filter provided to fetchScheduledClasses - this will return all classes');
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('start_time');

    if (error) throw error;

    console.log(`Fetched classes for ${studentId ? 'student' : 'tutor'} ID: ${studentId || tutorId}, Count: ${data?.length || 0}`);

    const classEvents: ClassEvent[] = (data || []).map((cls) => {
      // Generate tutorName and studentName from joined profiles data
      let tutorName = '';
      let studentName = '';

      // Handle getting tutor and student names from joined profile data using the aliases
      // First convert to unknown, then to our expected type to avoid TypeScript errors
      const tutorProfile = (cls.tutor as unknown) as Profile | null;
      const studentProfile = (cls.student as unknown) as Profile | null;
      
      if (tutorProfile) {
        tutorName = `${tutorProfile.first_name || ''} ${tutorProfile.last_name || ''}`.trim();
      }
      
      if (studentProfile) {
        studentName = `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`.trim();
      }
      
      // Safely handle potentially null values
      const status = cls.status || 'scheduled';
      const attendance = cls.attendance || 'pending';
      
      return {
        id: cls.id || '',
        title: cls.title || '',
        tutorName: tutorName || 'Unknown Tutor',
        studentName: studentName || 'Unknown Student',
        date: cls.date ? new Date(cls.date) : new Date(),
        startTime: cls.start_time ? cls.start_time.substring(0, 5) : '',
        endTime: cls.end_time ? cls.end_time.substring(0, 5) : '',
        subject: cls.subject || '',
        zoomLink: cls.zoom_link,
        notes: cls.notes,
        status: isValidClassStatus(status) ? status : 'scheduled',
        attendance: isValidAttendanceStatus(attendance) ? attendance : 'pending',
        studentId: cls.student_id || '',
        tutorId: cls.tutor_id || '',
      };
    });

    return classEvents;
  } catch (error: any) {
    toast.error(`Error loading scheduled classes: ${error.message}`);
    return [];
  }
};
