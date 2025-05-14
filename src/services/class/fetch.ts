
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
    // Log the request parameters for debugging
    console.log(`Fetching scheduled classes. TutorID: ${tutorId || 'none'}, StudentID: ${studentId || 'none'}`);
    
    // Start building the query
    let query = supabase.from('scheduled_classes').select(`
      id, title, date, start_time, end_time, subject, zoom_link, notes, 
      status, attendance, student_id, tutor_id, relationship_id
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
    console.log('Raw scheduled_classes data:', data);

    // Fetch tutor and student profiles separately to avoid the relationship error
    const classEvents: ClassEvent[] = await Promise.all((data || []).map(async (cls) => {
      // Get tutor profile
      const { data: tutorProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', cls.tutor_id)
        .single();
      
      // Get student profile
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', cls.student_id)
        .single();

      const tutorName = tutorProfile 
        ? `${tutorProfile.first_name || ''} ${tutorProfile.last_name || ''}`.trim() 
        : 'Unknown Tutor';
        
      const studentName = studentProfile 
        ? `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`.trim() 
        : 'Unknown Student';
      
      // Safely handle potentially null values
      const status = cls.status || 'scheduled';
      const attendance = cls.attendance || 'pending';
      
      return {
        id: cls.id || '',
        title: cls.title || '',
        tutorName,
        studentName,
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
        relationshipId: cls.relationship_id || '',
      };
    }));

    return classEvents;
  } catch (error: any) {
    console.error('Error fetching scheduled classes:', error);
    toast.error(`Error loading scheduled classes: ${error.message}`);
    return [];
  }
};
