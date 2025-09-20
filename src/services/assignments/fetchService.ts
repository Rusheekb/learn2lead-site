import { supabase } from '@/integrations/supabase/client';
import { Tutor, Student } from '@/types/tutorTypes';

export interface TutorWithProfileId extends Tutor {
  profileId: string; // The profiles.id for assignments
}

export interface StudentWithProfileId extends Student {
  profileId: string; // The profiles.id for assignments
}

export async function fetchTutorsWithProfileIds(): Promise<TutorWithProfileId[]> {
  // First get all active tutors
  const { data: tutorsData, error: tutorsError } = await supabase
    .from('tutors')
    .select('*')
    .eq('active', true);

  if (tutorsError) {
    console.error('Error fetching tutors:', tutorsError);
    throw tutorsError;
  }

  // Then get corresponding profile IDs for each tutor
  const tutorsWithProfileIds: TutorWithProfileId[] = [];
  
  for (const tutor of tutorsData || []) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', tutor.email)
      .maybeSingle();

    if (profileError) {
      console.error(`Error fetching profile for tutor ${tutor.email}:`, profileError);
      continue;
    }

    if (profile) {
      tutorsWithProfileIds.push({
        id: tutor.id,
        profileId: profile.id, // This is the profiles.id we need for assignments
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

  console.log('[fetchTutorsWithProfileIds] Found tutors with profile IDs:', tutorsWithProfileIds);
  return tutorsWithProfileIds;
}

export async function fetchStudentsWithProfileIds(): Promise<StudentWithProfileId[]> {
  // First get all active students
  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('active', true);

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    throw studentsError;
  }

  // Then get corresponding profile IDs for each student
  const studentsWithProfileIds: StudentWithProfileId[] = [];
  
  for (const student of studentsData || []) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', student.email)
      .maybeSingle();

    if (profileError) {
      console.error(`Error fetching profile for student ${student.email}:`, profileError);
      continue;
    }

    if (profile) {
      studentsWithProfileIds.push({
        id: student.id,
        profileId: profile.id, // This is the profiles.id we need for assignments
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

  console.log('[fetchStudentsWithProfileIds] Found students with profile IDs:', studentsWithProfileIds);
  return studentsWithProfileIds;
}