
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { transformDbRecordToClassEvent } from '../utils/classEventMapper';

export const updateClassLog = async (
  id: string,
  classEvent: Partial<ClassEvent>
): Promise<ClassEvent | null> => {
  const record: any = {};

  if (classEvent.title !== undefined) record['Class Number'] = classEvent.title;
  if (classEvent.tutorName !== undefined) record['Tutor Name'] = classEvent.tutorName;
  if (classEvent.studentName !== undefined) record['Student Name'] = classEvent.studentName;
  if (classEvent.date !== undefined) {
    record['Date'] = format(new Date(classEvent.date), 'yyyy-MM-dd');
    record['Day'] = format(new Date(classEvent.date), 'EEEE');
  }
  if (classEvent.startTime !== undefined) record['Time (CST)'] = classEvent.startTime;
  if (classEvent.duration !== undefined) record['Time (hrs)'] = classEvent.duration.toString();
  if (classEvent.subject !== undefined) record['Subject'] = classEvent.subject;
  if (classEvent.content !== undefined) record['Content'] = classEvent.content || null;
  if (classEvent.homework !== undefined) record['HW'] = classEvent.homework || null;
  if (classEvent.classCost !== undefined) record['Class Cost'] = classEvent.classCost?.toString() || null;
  if (classEvent.tutorCost !== undefined) record['Tutor Cost'] = classEvent.tutorCost?.toString() || null;
  if (classEvent.notes !== undefined) record['Additional Info'] = classEvent.notes || null;

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
