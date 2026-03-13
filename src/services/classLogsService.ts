
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { transformDbRecordToClassEvent } from './utils/classEventMapper';
import { formatDateForDatabase } from '@/utils/safeDateUtils';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import { logger } from '@/lib/logger';

const log = logger.create('classLogsService');

type ClassLogs = Database['public']['Tables']['class_logs']['Row'];

// Fetch all class logs
export const fetchClassLogs = async (): Promise<ClassEvent[]> => {
  log.debug('Fetching class logs from Supabase...');
  try {
    const classLogsResult = await supabase
      .from('class_logs')
      .select<string, ClassLogs>();

    if (classLogsResult.error) {
      log.error('Error fetching class logs', classLogsResult.error);
      return [];
    }

    const classLogs = classLogsResult.data || [];
    const transformedClassLogs = classLogs.map(record => transformDbRecordToClassEvent(record));

    return [...transformedClassLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    log.error('Unexpected error in fetchClassLogs', error);
    return [];
  }
};

// Create a new class log
export const createClassLog = async (
  classEvent: ClassEvent
): Promise<ClassEvent | null> => {
  const eventDate = parseDateToLocal(classEvent.date);
  const record: Record<string, any> = {
    'Class Number': classEvent.title,
    'Tutor Name': classEvent.tutorName,
    'Student Name': classEvent.studentName,
    Date: formatDateForDatabase(eventDate),
    Day: format(eventDate, 'EEEE'),
    'Time (CST)': classEvent.startTime,
    'Time (hrs)': classEvent.duration?.toString() || '0',
    Subject: classEvent.subject,
    Content: classEvent.content || null,
    HW: classEvent.homework || null,
    'Class ID': classEvent.id,
    'Class Cost': classEvent.classCost ?? null,
    'Tutor Cost': classEvent.tutorCost ?? null,
    'Additional Info': classEvent.notes || null,
  };

  if (classEvent.tutorId) record.tutor_user_id = classEvent.tutorId;
  if (classEvent.studentId) record.student_user_id = classEvent.studentId;

  const { data, error } = await supabase
    .from('class_logs')
    .insert(record as any)
    .select<string, ClassLogs>()
    .single();

  if (error) {
    log.error('Error creating class log', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return transformDbRecordToClassEvent(data);
};

// Update a class log
export const updateClassLog = async (
  id: string,
  updates: Record<string, any>
): Promise<ClassEvent | null> => {
  const safeUpdates: Record<string, any> = {};
  
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
    log.error('Error updating class log', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return transformDbRecordToClassEvent(data);
};

// Delete a class log
export const deleteClassLog = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id);

  if (error) {
    log.error('Error deleting class log', error);
    return false;
  }

  return true;
};
