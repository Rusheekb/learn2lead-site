
import { supabase } from '@/services/supabaseClient';
import type { TutorStudentAssignment } from './types';

export async function fetchAssignmentsForTutor(
  tutorId: string
): Promise<TutorStudentAssignment[]> {
  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .select('*')
    .eq('tutor_id', tutorId)
    .eq('active', true);

  if (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }

  return (data ?? []) as TutorStudentAssignment[];
}

export async function fetchAssignmentsForStudent(
  studentId: string
): Promise<TutorStudentAssignment[]> {
  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .select('*')
    .eq('student_id', studentId)
    .eq('active', true);

  if (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }

  return (data ?? []) as TutorStudentAssignment[];
}

export async function fetchActiveAssignmentsForAdmin(): Promise<
  TutorStudentAssignment[]
> {
  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .select('*')
    .eq('active', true);

  if (error) throw error;
  return (data ?? []) as TutorStudentAssignment[];
}
