
import { supabase, handleResult } from './supabaseClient';
import { Student as TutorStudent } from '@/types/tutorTypes';

export async function fetchStudents(): Promise<TutorStudent[]> {
  const result = await supabase.from('students').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  return result.data || [];
}

export async function createStudent(
  student: Omit<TutorStudent, 'id'>
): Promise<TutorStudent> {
  const result = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
  return handleResult(result);
}

export async function updateStudent(
  id: string,
  updates: Partial<TutorStudent>
): Promise<TutorStudent> {
  const result = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}

export async function deleteStudent(id: string): Promise<TutorStudent> {
  const result = await supabase
    .from('students')
    .delete()
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}
