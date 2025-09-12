
export * from './fetch';
export * from './mutations';
export * from './types';

// This file re-exports all assignment service functionality
// for easier imports throughout the application
export const getAssignmentId = async (tutorId: string, studentId: string): Promise<string | null> => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    const { data, error } = await supabase
      .from('tutor_student_assigned')
      .select('id')
      .eq('tutor_id', tutorId)
      .eq('student_id', studentId)
      .eq('active', true)
      .single();
    
    if (error) {
      console.error('Error fetching assignment ID:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Exception fetching assignment ID:', error);
    return null;
  }
};
