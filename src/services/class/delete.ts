
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const deleteScheduledClass = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scheduled_classes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast.success('Class deleted successfully');
    return true;
  } catch (error: any) {
    toast.error(`Error deleting class: ${error.message}`);
    return false;
  }
};
