
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScheduledClass } from './types';

export const updateScheduledClass = async (
  id: string,
  classData: Partial<ScheduledClass>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scheduled_classes')
      .update({
        ...classData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    toast.success('Class updated successfully');
    return true;
  } catch (error: any) {
    toast.error(`Error updating class: ${error.message}`);
    return false;
  }
};
