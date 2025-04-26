
import { supabase } from '@/integrations/supabase/client';
import { TutorStudentRelationship } from './types';

export async function fetchRelationshipsForTutor(tutorId: string) {
  const { data, error } = await supabase
    .from('tutor_student_relationships')
    .select('*')
    .eq('tutor_id', tutorId)
    .eq('active', true);
    
  if (error) {
    console.error('Error fetching relationships:', error);
    throw error;
  }
  
  return data || [];
}

export async function fetchRelationshipsForStudent(studentId: string) {
  const { data, error } = await supabase
    .from('tutor_student_relationships')
    .select('*')
    .eq('student_id', studentId)
    .eq('active', true);
    
  if (error) {
    console.error('Error fetching relationships:', error);
    throw error;
  }
  
  return data || [];
}

