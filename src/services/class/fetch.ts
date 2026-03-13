
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
import { logger } from '@/lib/logger';

const log = logger.create('classFetch');

export const fetchScheduledClasses = async (
  tutorId?: string,
  studentId?: string
): Promise<ClassEvent[]> => {
  try {
    let query = supabase.from('scheduled_classes').select('*');

    if (tutorId) {
      query = query.eq('tutor_id', tutorId);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('start_time');

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    const tutorIds = [...new Set(data.map(cls => cls.tutor_id).filter(Boolean))];
    const studentIds = [...new Set(data.map(cls => cls.student_id).filter(Boolean))];

    const [tutorProfilesResponse, studentProfilesResponse] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', tutorIds),
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentIds)
    ]);

    const tutorProfileMap = new Map(
      (tutorProfilesResponse.data || []).map(profile => [
        profile.id,
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Tutor'
      ])
    );

    const studentProfileMap = new Map(
      (studentProfilesResponse.data || []).map(profile => [
        profile.id,
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Student'
      ])
    );

    const classEvents: ClassEvent[] = data.map((cls) => {
      const tutorName = tutorProfileMap.get(cls.tutor_id) || 'Unknown Tutor';
      const studentName = studentProfileMap.get(cls.student_id) || 'Unknown Student';
      
      const status = cls.status || 'scheduled';
      const attendance = cls.attendance || 'pending';
      
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
        materialsUrl: cls.materials_url || [],
      };
    });

    return classEvents;
  } catch (error: any) {
    log.error('Error fetching scheduled classes', error);
    toast.error(`Error loading scheduled classes: ${error.message}`);
    return [];
  }
};
