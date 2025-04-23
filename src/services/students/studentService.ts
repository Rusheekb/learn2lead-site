
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types/tutorTypes';
import { toast } from 'sonner';

export async function fetchStudents(): Promise<Student[]> {
  const result = await supabase.from('students').select('*');

  if (result.error) {
    console.error('Error fetching students:', result.error);
    throw result.error;
  }

  return result.data || [];
}

export async function createStudent(student: Omit<Student, 'id'>): Promise<Student> {
  const result = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error creating student:', result.error);
    throw result.error;
  }
  
  return result.data;
}

export async function updateStudent(
  id: string,
  updates: Partial<Student>
): Promise<Student> {
  const result = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error updating student:', result.error);
    throw result.error;
  }
  
  return result.data;
}

export async function deleteStudent(id: string): Promise<Student> {
  const result = await supabase
    .from('students')
    .delete()
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error deleting student:', result.error);
    throw result.error;
  }
  
  return result.data;
}
