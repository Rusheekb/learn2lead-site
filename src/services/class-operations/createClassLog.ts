import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { transformDbRecordToClassEvent } from '../utils/classEventMapper';

/**
 * Create a new class log in the database
 */
export const createClassLog = async (
  classEvent: ClassEvent
): Promise<ClassEvent | null> => {
  // Convert ClassEvent to the format expected by the database
  const record = {
    'Class Number': classEvent.title,
    'Tutor Name': classEvent.tutorName,
    'Student Name': classEvent.studentName,
    Date:
      classEvent.date instanceof Date
        ? format(classEvent.date, 'yyyy-MM-dd')
        : classEvent.date,
    Day:
      classEvent.date instanceof Date
        ? format(classEvent.date, 'EEEE')
        : format(new Date(classEvent.date), 'EEEE'),
    'Time (CST)': classEvent.startTime,
    'Time (hrs)': (classEvent.duration || 0).toString(),
    Subject: classEvent.subject,
    Content: classEvent.content,
    HW: classEvent.homework,
    'Class Cost': classEvent.classCost?.toString(),
    'Tutor Cost': classEvent.tutorCost?.toString(),
    'Student Payment': classEvent.studentPayment,
    'Tutor Payment': classEvent.tutorPayment,
    'Additional Info': classEvent.notes,
  };

  const { data, error } = await supabase
    .from('class_logs')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Error creating class log:', error);
    return null;
  }

  return transformDbRecordToClassEvent(data);
};
