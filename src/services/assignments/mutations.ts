
import { supabase } from '@/services/supabaseClient';
import { toast } from 'sonner';
import { TutorStudentAssignment } from './types';

export async function createAssignment(input: {
  tutor_id: string;
  student_id: string;
}) {
  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .insert({ ...input, active: true })
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }

  toast.success('Tutor-student assignment created successfully');
  return data;
}

export async function endAssignment(id: string) {
  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error ending assignment:', error);
    throw error;
  }

  toast.success('Tutor-student assignment ended successfully');
  return data;
}
