import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScheduledClass } from './types';

export const updateScheduledClass = async (
  id: string,
  classData: Partial<ScheduledClass>
): Promise<boolean> => {
  try {
    // tutor_name/student_name are joined-in display fields on ScheduledClass,
    // not real columns on scheduled_classes — never valid to persist.
    const { tutor_name, student_name, ...dbFields } = classData;

    const { error } = await supabase
      .from('scheduled_classes')
      .update({
        ...dbFields,
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
