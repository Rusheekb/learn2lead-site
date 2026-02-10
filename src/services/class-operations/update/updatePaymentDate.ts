import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/**
 * Update payment date for a class log (student or tutor)
 */
export const updatePaymentDate = async (
  classId: string,
  field: 'student_payment_date' | 'tutor_payment_date',
  date: Date | null
): Promise<boolean> => {
  const record: Record<string, string | null> = {
    [field]: date ? format(date, 'yyyy-MM-dd') : null,
  };

  const { error } = await supabase
    .from('class_logs')
    .update(record)
    .eq('id', classId);

  if (error) {
    console.error(`Error updating ${field}:`, error);
    return false;
  }
  return true;
};

/**
 * Batch update tutor payment dates for multiple class logs
 */
export const batchUpdateTutorPaymentDate = async (
  classIds: string[],
  date: Date | null
): Promise<boolean> => {
  const dateStr = date ? format(date, 'yyyy-MM-dd') : null;

  const { error } = await supabase
    .from('class_logs')
    .update({ tutor_payment_date: dateStr })
    .in('id', classIds);

  if (error) {
    console.error('Error batch updating tutor payment dates:', error);
    return false;
  }
  return true;
};
