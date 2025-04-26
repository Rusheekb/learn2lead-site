
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TutorStudentRelationship } from './types';

export async function createRelationship(input: {
  tutor_id: string;
  student_id: string;
  assigned_by: string;
}) {
  const { data, error } = await supabase
    .from('tutor_student_relationships')
    .insert({ ...input, active: true })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating relationship:', error);
    throw error;
  }
  
  toast.success('Tutor-student relationship created successfully');
  return data;
}

export async function endRelationship(id: string) {
  const { data, error } = await supabase
    .from('tutor_student_relationships')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error ending relationship:', error);
    throw error;
  }
  
  toast.success('Tutor-student relationship ended successfully');
  return data;
}

