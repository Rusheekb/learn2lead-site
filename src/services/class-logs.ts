
import { supabase, handleResult } from './supabaseClient';
import { ClassEvent, DbClassLog } from '@/types/tutorTypes';
import { transformDbRecordToClassEvent } from './class-operations/utils/classEventMapper';
import { format } from 'date-fns';

export async function fetchClassLogs(): Promise<ClassEvent[]> {
  const result = await supabase.from('class_logs').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  
  // We need to transform the database records to ClassEvent type
  // Using the utility function from classEventMapper
  return result.data ? result.data.map(record => transformDbRecordToClassEvent(record as any)) : [];
}

export async function createClassLog(
  classLog: Record<string, any>
): Promise<ClassEvent> {
  // First, format the date correctly
  const dateValue = classLog.Date || classLog.date;
  const formattedDate = dateValue ? 
    (typeof dateValue === 'string' ? 
      dateValue : 
      new Date(dateValue).toISOString().split('T')[0]) : 
    new Date().toISOString().split('T')[0];
    
  // Then calculate day based on the formatted date
  const dayValue = classLog.day || classLog.Day || 
    new Date(formattedDate).toLocaleDateString('en-US', { weekday: 'long' });
    
  // Create a properly formatted object that matches the database schema
  const dbRecord = {
    'Date': formattedDate,
    'Class Number': classLog.title || classLog['Class Number'] || null,
    'Tutor Name': classLog.tutorName || classLog['Tutor Name'] || null,
    'Student Name': classLog.studentName || classLog['Student Name'] || null,
    'Day': dayValue,
    'Time (CST)': classLog.startTime || classLog['Time (CST)'] || null,
    'Time (hrs)': classLog.duration?.toString() || classLog['Time (hrs)'] || null,
    'Subject': classLog.subject || classLog.Subject || null,
    'Content': classLog.content || classLog.Content || null,
    'HW': classLog.homework || classLog.HW || null,
    'Class Cost': classLog.classCost?.toString() || classLog['Class Cost'] || null,
    'Tutor Cost': classLog.tutorCost?.toString() || classLog['Tutor Cost'] || null,
    'Student Payment': classLog.studentPayment || classLog['Student Payment'] || 'pending',
    'Tutor Payment': classLog.tutorPayment || classLog['Tutor Payment'] || 'pending',
    'Additional Info': classLog.notes || classLog['Additional Info'] || null,
    'Class ID': classLog.classId || classLog['Class ID'] || null
  };
  
  const result = await supabase
    .from('class_logs')
    .insert(dbRecord)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error creating class log:', result.error);
    throw result.error;
  }
  
  // Transform the DB record to a ClassEvent
  return transformDbRecordToClassEvent(result.data as any);
}

export async function updateClassLog(
  id: string,
  updates: Partial<DbClassLog>
): Promise<ClassEvent> {
  const result = await supabase
    .from('class_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  // Transform to our application type
  return transformDbRecordToClassEvent(handleResult(result) as any);
}

export async function deleteClassLog(id: string): Promise<ClassEvent> {
  const result = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id)
    .select()
    .single();
    
  // Transform to our application type
  return transformDbRecordToClassEvent(handleResult(result) as any);
}
