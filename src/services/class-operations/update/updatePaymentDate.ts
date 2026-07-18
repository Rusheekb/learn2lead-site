import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

const log = logger.create('paymentDate');

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
    log.error(`Error updating ${field}`, error);
    return false;
  }
  return true;
};

export const batchUpdateTutorPaymentDate = async (
  classIds: string[],
  date: Date | null
): Promise<boolean> => {
  const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
  const isPaid = date !== null;

  const { error } = await supabase
    .from('class_logs')
    .update({ tutor_payment_date: dateStr, tutor_is_paid: isPaid })
    .in('id', classIds);

  if (error) {
    log.error('Error batch updating tutor payment dates', error);
    return false;
  }
  return true;
};

export const updateTutorPaymentStatus = async (
  classId: string,
  isPaid: boolean
): Promise<boolean> => {
  const dateStr = isPaid ? format(new Date(), 'yyyy-MM-dd') : null;

  const { error } = await supabase
    .from('class_logs')
    .update({ tutor_is_paid: isPaid, tutor_payment_date: dateStr })
    .eq('id', classId);

  if (error) {
    log.error('Error updating tutor payment status', error);
    return false;
  }
  return true;
};

export const batchUpdateStudentPaymentDate = async (
  classIds: string[],
  date: Date | null
): Promise<boolean> => {
  if (classIds.length === 0) return true;
  const dateStr = date ? format(date, 'yyyy-MM-dd') : null;

  const { error } = await supabase
    .from('class_logs')
    .update({ student_payment_date: dateStr })
    .in('id', classIds);

  if (error) {
    log.error('Error batch updating student payment dates', error);
    return false;
  }
  return true;
};
