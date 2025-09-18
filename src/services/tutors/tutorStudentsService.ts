import { supabase } from '@/integrations/supabase/client';

export interface TutorStudentData {
  tutor_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  tutor_name: string;
  subjects: string[];
  grade: string;
  payment_status: string;
  active: boolean;
  assigned_at: string;
}

export async function fetchTutorStudentsByEmail(): Promise<TutorStudentData[]> {
  const { data, error } = await supabase.rpc('get_tutor_students_by_email');
  
  if (error) {
    console.error('Error fetching tutor students:', error);
    throw error;
  }
  
  return data || [];
}