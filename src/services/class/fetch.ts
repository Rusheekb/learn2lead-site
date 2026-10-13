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
import { classTimesForViewer } from '@/lib/time';

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

    const { data, error } = await query.order('start_at', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    const tutorIds = [
      ...new Set(data.map((cls) => cls.tutor_id).filter(Boolean)),
    ];
    const studentIds = [
      ...new Set(data.map((cls) => cls.student_id).filter(Boolean)),
    ];

    const [tutorProfilesResponse, studentProfilesResponse] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', tutorIds),
      supabase
        .from('profiles')
        .select('id, first_name, last_name, email, timezone')
        .in('id', studentIds),
    ]);

    const studentTimezoneMap = new Map(
      (studentProfilesResponse.data || []).map((profile) => [
        profile.id,
        profile.timezone,
      ])
    );

    const tutorProfileMap = new Map(
      (tutorProfilesResponse.data || []).map((profile) => [
        profile.id,
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
          profile.email ||
          'Unknown Tutor',
      ])
    );

    const studentProfileMap = new Map(
      (studentProfilesResponse.data || []).map((profile) => [
        profile.id,
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
          profile.email ||
          'Unknown Student',
      ])
    );

    const classEvents: ClassEvent[] = data.map((cls) => {
      const tutorName = tutorProfileMap.get(cls.tutor_id) || 'Unknown Tutor';
      const studentName =
        studentProfileMap.get(cls.student_id) || 'Unknown Student';

      const status = cls.status || 'scheduled';
      const attendance = cls.attendance || 'pending';

      // Date and times as the viewer should see them (their time zone).
      const times = classTimesForViewer(cls);
      const dateObj = times.date
        ? parse(times.date, 'yyyy-MM-dd', new Date())
        : new Date();

      return {
        id: cls.id || '',
        title: cls.title || '',
        tutorName,
        studentName,
        date: dateObj,
        startTime: times.startTime,
        endTime: times.endTime,
        startAt: times.startAt,
        endAt: times.endAt,
        tzAbbr: times.tzAbbr,
        studentTimezone: studentTimezoneMap.get(cls.student_id) ?? null,
        subject: cls.subject || '',
        zoomLink: cls.zoom_link || '',
        notes: cls.notes || '',
        status: isValidClassStatus(status) ? status : 'scheduled',
        attendance: isValidAttendanceStatus(attendance)
          ? attendance
          : 'pending',
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
