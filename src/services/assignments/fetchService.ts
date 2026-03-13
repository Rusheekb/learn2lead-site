import { supabase } from '@/integrations/supabase/client';
import { Tutor, Student } from '@/types/tutorTypes';
import { logger } from '@/lib/logger';

const log = logger.create('assignmentFetch');

export interface TutorWithProfileId extends Tutor {
  profileId: string;
}

export interface StudentWithProfileId extends Student {
  profileId: string;
}

export async function fetchTutorsWithProfileIds(): Promise<TutorWithProfileId[]> {
  const { data: tutorsData, error: tutorsError } = await supabase
    .from('tutors')
    .select('*')
    .eq('active', true);

  if (tutorsError) {
    log.error('Error fetching tutors', tutorsError);
    throw tutorsError;
  }

  const tutorsWithProfileIds: TutorWithProfileId[] = [];
  
  for (const tutor of tutorsData || []) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', tutor.email)
      .maybeSingle();

    if (profileError) {
      log.error(`Error fetching profile for tutor ${tutor.email}`, profileError);
      continue;
    }

    if (profile) {
      tutorsWithProfileIds.push({
        id: tutor.id,
        profileId: profile.id,
        name: tutor.name,
        email: tutor.email,
        subjects: tutor.subjects || [],
        rating: 5,
        classes: 0,
        hourlyRate: tutor.hourly_rate || 0,
        active: tutor.active
      });
    }
  }

  log.debug('Found tutors with profile IDs', { count: tutorsWithProfileIds.length });
  return tutorsWithProfileIds;
}

export async function fetchStudentsWithProfileIds(): Promise<StudentWithProfileId[]> {
  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('active', true);

  if (studentsError) {
    log.error('Error fetching students', studentsError);
    throw studentsError;
  }

  const studentsWithProfileIds: StudentWithProfileId[] = [];
  
  for (const student of studentsData || []) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', student.email)
      .maybeSingle();

    if (profileError) {
      log.error(`Error fetching profile for student ${student.email}`, profileError);
      continue;
    }

    if (profile) {
      studentsWithProfileIds.push({
        id: student.id,
        profileId: profile.id,
        name: student.name,
        email: student.email,
        subjects: student.subjects || [],
        grade: student.grade,
        active: student.active,
        enrollmentDate: student.enrollment_date,
        paymentStatus: student.payment_status as any
      });
    }
  }

  log.debug('Found students with profile IDs', { count: studentsWithProfileIds.length });
  return studentsWithProfileIds;
}
