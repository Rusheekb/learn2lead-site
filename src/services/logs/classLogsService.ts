import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { parseNumericString } from '@/utils/numberUtils';
import { transformClassLog } from './transformers';
import { DbClassLog, DbCodeLog, TransformedClassLog } from './types';

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
