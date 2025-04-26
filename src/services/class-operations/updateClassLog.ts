import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { transformDbRecordToClassEvent } from '../utils/classEventMapper';

/**
 * Update an existing class log in the database
 */
export const updateClassLog = async (
  id: string,
  classEvent: Partial<ClassEvent>
): Promise<ClassEvent | null> => {
  // Convert ClassEvent to the format expected by the database
  const record: any = {};

  if (classEvent.title !== undefined) record['Class Number'] = classEvent.title;
  if (classEvent.tutorName !== undefined)
    record['Tutor Name'] = classEvent.tutorName;
  if (classEvent.studentName !== undefined)
    record['Student Name'] = classEvent.studentName;
  if (classEvent.date !== undefined) {
    record['Date'] =
      classEvent.date instanceof Date
        ? format(classEvent.date, 'yyyy-MM-dd')
        : classEvent.date;
    record['Day'] =
      classEvent.date instanceof Date
        ? format(classEvent.date, 'EEEE')
        : format(new Date(classEvent.date), 'EEEE');
  }
  if (classEvent.startTime !== undefined)
    record['Time (CST)'] = classEvent.startTime;
  if (classEvent.duration !== undefined)
    record['Time (hrs)'] = classEvent.duration.toString();
  if (classEvent.subject !== undefined) record['Subject'] = classEvent.subject;
  if (classEvent.content !== undefined) record['Content'] = classEvent.content;
  if (classEvent.homework !== undefined) record['HW'] = classEvent.homework;
  if (classEvent.classCost !== undefined)
    record['Class Cost'] = classEvent.classCost.toString();
  if (classEvent.tutorCost !== undefined)
    record['Tutor Cost'] = classEvent.tutorCost.toString();
  if (classEvent.studentPayment !== undefined)
    record['Student Payment'] = classEvent.studentPayment;
  if (classEvent.tutorPayment !== undefined)
    record['Tutor Payment'] = classEvent.tutorPayment;
  if (classEvent.notes !== undefined)
    record['Additional Info'] = classEvent.notes;

  const { data, error } = await supabase
    .from('class_logs')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating class log:', error);
    return null;
  }

  return transformDbRecordToClassEvent(data);
};
