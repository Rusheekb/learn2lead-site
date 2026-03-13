
export * from './fetch';
export * from './mutations';
export * from './types';

import { logger } from '@/lib/logger';

const log = logger.create('assignments');

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
      log.error('Error fetching assignment ID', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    log.error('Exception fetching assignment ID', error);
    return null;
  }
};
