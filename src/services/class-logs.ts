
import { supabase, handleResult } from './supabaseClient';
import { ClassEvent, DbClassLog } from '@/types/tutorTypes';
import { transformDbRecordToClassEvent } from './utils/classEventMapper';
import { format } from 'date-fns';
import { generateClassId } from '@/utils/classIdGenerator';

export async function fetchClassLogs(): Promise<ClassEvent[]> {
  const result = await supabase.from('class_logs').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  
  // We need to transform the database records to ClassEvent type
  // Using the utility function from classEventMapper
  return result.data ? result.data.map(record => transformDbRecordToClassEvent(record)) : [];
}

export async function createClassLog(
  classLog: Record<string, any>
): Promise<ClassEvent> {
  // First, format the date correctly
  const dateValue = classLog.Date || classLog.date;
  const formattedDate = dateValue ? 
    (typeof dateValue === 'string' ? 
      dateValue : 
      format(new Date(dateValue), 'yyyy-MM-dd')) : 
    format(new Date(), 'yyyy-MM-dd');
    
  // Then calculate day based on the formatted date
  const dayValue = classLog.day || classLog.Day || 
    new Date(formattedDate).toLocaleDateString('en-US', { weekday: 'long' });
  
  // Generate or use existing Class Number
  let classNumber = classLog['Class Number'];
  
  if (!classNumber) {
    // Fetch existing class numbers for ID generation
    const { data: existingLogs } = await supabase
      .from('class_logs')
      .select('Class Number')
      .eq('Date', formattedDate);
    
    const existingIds = existingLogs?.map(log => (log as any)['Class Number'] as string).filter(Boolean) || [];
    
    // Generate unique class ID
    const studentName = classLog.studentName || classLog['Student Name'] || 'Unknown';
    const tutorName = classLog.tutorName || classLog['Tutor Name'] || 'Unknown';
    
    classNumber = generateClassId({
      studentName,
      tutorName,
      date: formattedDate,
      existingIds,
    });
  }
    
  // Create a properly formatted object that matches the database schema
  const dbRecord = {
    'Date': formattedDate,
    'Class Number': classNumber,
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
    'Class ID': classLog.classId || classLog['Class ID'] || null,
    // Add these to support status and attendance updates
    'Status': classLog.status || classLog['Status'] || null,
    'Attendance': classLog.attendance || classLog['Attendance'] || null
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
  return transformDbRecordToClassEvent(result.data);
}

export async function updateClassLog(
  id: string,
  updates: Record<string, any>
): Promise<ClassEvent> {
  // Make sure we're using the correct database field names
  // The updates should already be in the correct format (with capital field names)
  // but we can add validation here if needed
  
  if (updates.date) {
    updates['Date'] = typeof updates.date === 'string' 
      ? updates.date 
      : format(updates.date, 'yyyy-MM-dd');
    delete updates.date;
  }
  
  const result = await supabase
    .from('class_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  // Transform to our application type
  return transformDbRecordToClassEvent(handleResult(result));
}

export async function deleteClassLog(id: string): Promise<ClassEvent> {
  const result = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id)
    .select()
    .single();
    
  // Transform to our application type
  return transformDbRecordToClassEvent(handleResult(result));
}
