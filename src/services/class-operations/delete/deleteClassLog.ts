
import { supabase } from '@/integrations/supabase/client';

export const deleteClassLog = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('class_logs').delete().eq('id', id);

  if (error) {
    console.error('Error deleting class log:', error);
    return false;
  }

  return true;
};
