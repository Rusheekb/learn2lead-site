
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { transformDbRecordToClassEvent } from '@/services/utils/classEventMapper';

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

  // Transform the data to match our ClassEvent type
  // This casts to any first because the database types and our application types don't match exactly
  return transformDbRecordToClassEvent(data);
};
