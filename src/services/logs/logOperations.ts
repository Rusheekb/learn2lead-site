import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { UpdateDbClassLog, TransformedClassLog } from './types';
import { transformClassLog } from './transformers';
import { Database } from '@/integrations/supabase/types';

type ClassLogs = Database['public']['Tables']['class_logs']['Row'];

// Update an existing class log
export const updateClassLog = async (
  id: string,
  classEvent: Partial<ClassEvent>
): Promise<ClassEvent | null> => {
  const updateData: UpdateDbClassLog = {};

  if (classEvent.title) updateData['Class Number'] = classEvent.title;
  if (classEvent.tutorName) updateData['Tutor Name'] = classEvent.tutorName;
  if (classEvent.studentName)
    updateData['Student Name'] = classEvent.studentName;
  if (classEvent.date) {
    updateData['Date'] = format(new Date(classEvent.date), 'yyyy-MM-dd');
    updateData['Day'] = format(new Date(classEvent.date), 'EEEE');
  }
  if (classEvent.startTime) updateData['Time (CST)'] = classEvent.startTime;
  if (classEvent.duration)
    updateData['Time (hrs)'] = classEvent.duration.toString();
  if (classEvent.subject) updateData['Subject'] = classEvent.subject;
  if (classEvent.content !== undefined)
    updateData['Content'] = classEvent.content || null;
  if (classEvent.homework !== undefined)
    updateData['HW'] = classEvent.homework || null;
  if (classEvent.classCost !== undefined)
    updateData['Class Cost'] = classEvent.classCost ?? null;
  if (classEvent.tutorCost !== undefined)
    updateData['Tutor Cost'] = classEvent.tutorCost ?? null;
  if (classEvent.notes !== undefined)
    updateData['Additional Info'] = classEvent.notes || null;

  const { data, error } = await supabase
    .from('class_logs')
    .update(updateData)
    .eq('id', id)
    .select<string, ClassLogs>()
    .single();

  if (error) {
    console.error('Error updating class log:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  const transformedData = transformClassLog(data);
  return transformedData as ClassEvent;
};

// Delete a class log
export const deleteClassLog = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('class_logs').delete().eq('id', id);

  if (error) {
    console.error('Error deleting class log:', error);
    return false;
  }

  return true;
};
