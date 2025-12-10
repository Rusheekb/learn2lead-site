
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { format } from 'date-fns';
import { transformDbRecordToClassEvent } from '@/services/utils/classEventMapper';
import { generateClassId } from '@/utils/classIdGenerator';
import { parseDateToLocal, formatDateForDatabase } from '@/utils/safeDateUtils';

export const createClassLog = async (
  classEvent: ClassEvent
): Promise<ClassEvent | null> => {
  const eventDate = parseDateToLocal(classEvent.date);
  const formattedDate = formatDateForDatabase(eventDate);
  
  // Fetch existing class numbers for this date/tutor/student combination
  const { data: existingLogs } = await supabase
    .from('class_logs')
    .select('Class Number')
    .eq('Date', formattedDate);
  
  const existingIds = existingLogs?.map(log => (log as any)['Class Number'] as string).filter(Boolean) || [];
  
  // Generate unique class ID
  const classNumber = generateClassId({
    studentName: classEvent.studentName || 'Unknown',
    tutorName: classEvent.tutorName || 'Unknown',
    date: classEvent.date,
    existingIds,
  });
  
  // Payment dates default to NULL (unpaid) - date-based payment tracking
  const record = {
    'Class Number': classNumber,
    'Tutor Name': classEvent.tutorName,
    'Student Name': classEvent.studentName,
    Date: formattedDate,
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
  return transformDbRecordToClassEvent(data);
};
