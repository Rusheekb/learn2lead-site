
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { transformDbRecordToClassEvent } from '../utils/classEventMapper';

export const createClassLog = async (
  classEvent: ClassEvent
): Promise<ClassEvent | null> => {
  const record = {
    'Class Number': classEvent.title,
    'Tutor Name': classEvent.tutorName,
    'Student Name': classEvent.studentName,
    Date: format(new Date(classEvent.date), 'yyyy-MM-dd'),
    Day: format(new Date(classEvent.date), 'EEEE'),
    'Time (CST)': classEvent.startTime,
    'Time (hrs)': classEvent.duration?.toString() || '0',
    Subject: classEvent.subject,
    Content: classEvent.content || null,
    HW: classEvent.homework || null,
    'Class ID': classEvent.id,
    'Class Cost': classEvent.classCost?.toString() || null,
    'Tutor Cost': classEvent.tutorCost?.toString() || null,
    'Student Payment': 'Pending',
    'Tutor Payment': 'Pending',
    'Additional Info': classEvent.notes || null,
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

  // Add explicit type assertion since we know the structure
  return transformDbRecordToClassEvent(data as any);
};
