
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { parseNumericString } from '@/utils/numberUtils';
import { transformClassLog } from './logs/transformers';
import { DbClassLog, DbCodeLog, TransformedClassLog } from './logs/types';

type ClassLogs = Database['public']['Tables']['class_logs']['Row'];

// Fetch all class logs
export const fetchClassLogs = async (): Promise<TransformedClassLog[]> => {
  console.log('Fetching class logs from Supabase...');
  try {
    // Only fetch class_logs since code_logs doesn't exist in the types
    const classLogsResult = await supabase
      .from('class_logs')
      .select<string, ClassLogs>();

    if (classLogsResult.error) {
      console.error('Error fetching class logs:', classLogsResult.error);
      return [];
    }

    const classLogs = classLogsResult.data || [];

    // Transform logs
    const transformedClassLogs = classLogs.map(transformClassLog);

    // Sort by date
    return [...transformedClassLogs].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  } catch (error) {
    console.error('Unexpected error in fetchClassLogs:', error);
    return [];
  }
};

// Create a new class log
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
    'Class Cost': classEvent.classCost ?? null,
    'Tutor Cost': classEvent.tutorCost ?? null,
    'Student Payment': 'Pending',
    'Tutor Payment': 'Pending',
    'Additional Info': classEvent.notes || null,
    // Only add Status and Attendance if they're needed but avoid adding them
    // directly to prevent the PGRST204 error
  };

  const { data, error } = await supabase
    .from('class_logs')
    .insert(record)
    .select<string, ClassLogs>()
    .single();

  if (error) {
    console.error('Error creating class log:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  const transformedData = transformClassLog(data);
  return transformedData as ClassEvent;
};

// Update a class log - Convert ClassEvent to DbClassLog format
export const updateClassLog = async (
  id: string,
  updates: Record<string, any>
): Promise<ClassEvent | null> => {
  // Remove any fields that don't exist in the class_logs table
  const safeUpdates: Record<string, any> = {};
  
  // Only include fields that actually exist in the table
  if (updates['Class Number'] !== undefined) safeUpdates['Class Number'] = updates['Class Number'];
  if (updates['Tutor Name'] !== undefined) safeUpdates['Tutor Name'] = updates['Tutor Name'];
  if (updates['Student Name'] !== undefined) safeUpdates['Student Name'] = updates['Student Name'];
  if (updates['Date'] !== undefined) safeUpdates['Date'] = updates['Date'];
  if (updates['Day'] !== undefined) safeUpdates['Day'] = updates['Day'];
  if (updates['Time (CST)'] !== undefined) safeUpdates['Time (CST)'] = updates['Time (CST)'];
  if (updates['Time (hrs)'] !== undefined) safeUpdates['Time (hrs)'] = updates['Time (hrs)'];
  if (updates['Subject'] !== undefined) safeUpdates['Subject'] = updates['Subject'];
  if (updates['Content'] !== undefined) safeUpdates['Content'] = updates['Content'];
  if (updates['HW'] !== undefined) safeUpdates['HW'] = updates['HW'];
  if (updates['Class Cost'] !== undefined) safeUpdates['Class Cost'] = updates['Class Cost'];
  if (updates['Tutor Cost'] !== undefined) safeUpdates['Tutor Cost'] = updates['Tutor Cost'];
  if (updates['Student Payment'] !== undefined) safeUpdates['Student Payment'] = updates['Student Payment'];
  if (updates['Tutor Payment'] !== undefined) safeUpdates['Tutor Payment'] = updates['Tutor Payment'];
  if (updates['Additional Info'] !== undefined) safeUpdates['Additional Info'] = updates['Additional Info'];
  
  const { data, error } = await supabase
    .from('class_logs')
    .update(safeUpdates)
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
  const { error } = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting class log:', error);
    return false;
  }

  return true;
};
