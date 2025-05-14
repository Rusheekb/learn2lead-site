
export * from './fetch';
export * from './mutations';
export * from './types';

// This file re-exports all relationship service functionality
// for easier imports throughout the application
export const getRelationshipId = async (tutorId: string, studentId: string): Promise<string | null> => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    const { data, error } = await supabase
      .from('tutor_student_relationships')
      .select('id')
      .eq('tutor_id', tutorId)
      .eq('student_id', studentId)
      .eq('active', true)
      .single();
    
    if (error) {
      console.error('Error fetching relationship ID:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Exception fetching relationship ID:', error);
    return null;
  }
};
