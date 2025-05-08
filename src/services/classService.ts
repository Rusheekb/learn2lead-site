import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClassEvent, ClassStatus, isValidClassStatus, AttendanceStatus, isValidAttendanceStatus } from '@/types/tutorTypes';
import { parseTime24to12 } from '@/utils/dateTimeUtils';

export interface ScheduledClass {
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
  created_at: string;
  updated_at: string;
  tutor_name?: string;
  student_name?: string;
}

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
      const tutorProfile = cls.tutor;
      const studentProfile = cls.student;
      
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

export const createScheduledClass = async (
  classData: Record<string, any>
): Promise<string | null> => {
  try {
    // Ensure required fields are present
    const requiredFields = {
      title: classData.title,
      tutor_id: classData.tutor_id,
      student_id: classData.student_id,
      date: classData.date,
      start_time: classData.start_time,
      end_time: classData.end_time,
      subject: classData.subject,
    };

    // Check that all required fields have values
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        toast.error(`Missing required field: ${key}`);
        return null;
      }
    }

    // Create a properly typed object for insertion
    const insertData = {
      title: classData.title,
      tutor_id: classData.tutor_id,
      student_id: classData.student_id,
      date: classData.date,
      start_time: classData.start_time,
      end_time: classData.end_time,
      subject: classData.subject,
      zoom_link: classData.zoom_link || null,
      notes: classData.notes || null,
      status: classData.status || 'scheduled',
      attendance: classData.attendance || null,
    };

    const { data, error } = await supabase
      .from('scheduled_classes')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;
    toast.success('Class scheduled successfully');
    return data?.id || null;
  } catch (error: any) {
    toast.error(`Error scheduling class: ${error.message}`);
    return null;
  }
};

export const updateScheduledClass = async (
  id: string,
  classData: Partial<ScheduledClass>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scheduled_classes')
      .update({
        ...classData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    toast.success('Class updated successfully');
    return true;
  } catch (error: any) {
    toast.error(`Error updating class: ${error.message}`);
    return false;
  }
};

export const deleteScheduledClass = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scheduled_classes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast.success('Class deleted successfully');
    return true;
  } catch (error: any) {
    toast.error(`Error deleting class: ${error.message}`);
    return false;
  }
};
