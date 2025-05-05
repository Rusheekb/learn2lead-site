
import { supabase } from '@/services/supabaseClient';
import type { TutorStudentRelationship } from './types';

export async function fetchRelationshipsForTutor(
  tutorId: string
): Promise<TutorStudentRelationship[]> {
  const { data, error } = await supabase
    .from('tutor_student_relationships')
    .select('*')
    .eq('tutor_id', tutorId)
    .eq('active', true);

  if (error) {
    console.error('Error fetching relationships:', error);
    throw error;
  }

  return (data ?? []) as TutorStudentRelationship[];
}

export async function fetchRelationshipsForStudent(
  studentId: string
): Promise<TutorStudentRelationship[]> {
  const { data, error } = await supabase
    .from('tutor_student_relationships')
    .select('*')
    .eq('student_id', studentId)
    .eq('active', true);

  if (error) {
    console.error('Error fetching relationships:', error);
    throw error;
  }

  return (data ?? []) as TutorStudentRelationship[];
}

export async function fetchActiveRelationshipsForAdmin(): Promise<
  TutorStudentRelationship[]
> {
  const { data, error } = await supabase
    .from('tutor_student_relationships')
    .select('*')
    .eq('active', true);

  if (error) throw error;
  return (data ?? []) as TutorStudentRelationship[];
}
