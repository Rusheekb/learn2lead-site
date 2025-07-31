
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ClassEvent,
  isValidClassStatus,
  isValidAttendanceStatus,
} from '@/types/tutorTypes';
import { parseTime24to12 } from '@/utils/dateTimeUtils';
import { parse } from 'date-fns';
import { Profile } from './types';

export const fetchScheduledClasses = async (
  tutorId?: string,
  studentId?: string
): Promise<ClassEvent[]> => {
  try {
    // Log the request parameters for debugging
    console.log(`Fetching scheduled classes. TutorID: ${tutorId || 'none'}, StudentID: ${studentId || 'none'}`);
    
    // Start building the query with select('*') to fetch all columns
    let query = supabase.from('scheduled_classes').select('*');

    // Filter by tutor_id if provided
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

    // Debug log the raw data returned from Supabase
    console.log(`Fetched raw scheduled_classes data (count: ${data?.length || 0}):`, data);

    // Fetch tutor and student profiles separately to get names
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
      
      // Convert date string to Date object in local time to avoid timezone shift
      const dateObj = cls.date
        ? parse(cls.date, 'yyyy-MM-dd', new Date())
        : new Date();
      
      return {
        id: cls.id || '',
        title: cls.title || '',
        tutorName,
        studentName,
        date: dateObj,
        startTime: cls.start_time ? cls.start_time.substring(0, 5) : '',
        endTime: cls.end_time ? cls.end_time.substring(0, 5) : '',
        subject: cls.subject || '',
        zoomLink: cls.zoom_link || '',
        notes: cls.notes || '',
        status: isValidClassStatus(status) ? status : 'scheduled',
        attendance: isValidAttendanceStatus(attendance) ? attendance : 'pending',
        studentId: cls.student_id || '',
        tutorId: cls.tutor_id || '',
        relationshipId: cls.relationship_id || '',
        recurring: false,
        materials: [],
      };
    }));

    console.log('Transformed class events:', classEvents);
    return classEvents;
  } catch (error: any) {
    console.error('Error fetching scheduled classes:', error);
    toast.error(`Error loading scheduled classes: ${error.message}`);
    return [];
  }
};
