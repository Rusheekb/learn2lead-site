
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { transformDbRecordToClassEvent } from '../utils/classEventMapper';

export const fetchClassLog = async (id: string): Promise<ClassEvent | null> => {
  const { data, error } = await supabase
    .from('class_logs')
    .select()
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching class log:', error);
    return null;
  }

  // Add explicit type assertion since we know the structure
  return transformDbRecordToClassEvent(data as any);
};
