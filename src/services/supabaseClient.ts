
import { supabase } from '@/integrations/supabase/client';
export { supabase }; //

import type {
  ClassEvent,
  Student as TutorStudent,
  ContentShareItem,
  DbClassLog,
  PaymentStatus,
  ClassStatus,
  AttendanceStatus
} from '@/types/tutorTypes';
import type { Profile } from '@/types/profile';
import type {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';
import { transformDbRecordToClassEvent } from './class-operations/utils/classEventMapper';

// Unified result handler for DRY error handling - Overload for single results
function handleResult<T>(response: PostgrestSingleResponse<T>): T;
// Overload for multiple results
function handleResult<T>(response: PostgrestResponse<T>): T[];
// Implementation
function handleResult<T>(
  response: PostgrestResponse<T> | PostgrestSingleResponse<T>
): T | T[] {
  if (response.error) {
    console.error(response.error);
    throw response.error;
  }
  if (!response.data) {
    throw new Error('No data returned');
  }
  return response.data;
}

// Class Logs Operations
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
  // Create a properly formatted object that matches the database schema
  const dbRecord: Record<string, any> = {
    // Required field with appropriate format
    'Date': classLog.Date || (classLog.date ? 
      (typeof classLog.date === 'string' ? 
        classLog.date : 
        new Date(classLog.date).toISOString().split('T')[0]) : 
      new Date().toISOString().split('T')[0]),
      
    // Map other fields from the input
    'Class Number': classLog.title || classLog['Class Number'] || null,
    'Tutor Name': classLog.tutorName || classLog['Tutor Name'] || null,
    'Student Name': classLog.studentName || classLog['Student Name'] || null,
    'Day': classLog.day || classLog.Day || new Date(dbRecord['Date']).toLocaleDateString('en-US', { weekday: 'long' }),
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

// Now delete returns the deleted row:
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

// Student Operations
export async function fetchStudents(): Promise<TutorStudent[]> {
  const result = await supabase.from('students').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  return result.data || [];
}

export async function createStudent(
  student: Omit<TutorStudent, 'id'>
): Promise<TutorStudent> {
  const result = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
  return handleResult(result);
}

export async function updateStudent(
  id: string,
  updates: Partial<TutorStudent>
): Promise<TutorStudent> {
  const result = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}

export async function deleteStudent(id: string): Promise<TutorStudent> {
  const result = await supabase
    .from('students')
    .delete()
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}

// Profile Operations
export async function fetchProfile(userId: string): Promise<Profile> {
  const result = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return handleResult(result);
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const result = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return handleResult(result);
}

// Content Shares Operations
export async function fetchContentShares(): Promise<ContentShareItem[]> {
  const result = await supabase.from('content_shares').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  return result.data || [];
}

export async function createContentShare(
  share: Omit<ContentShareItem, 'id'>
): Promise<ContentShareItem> {
  const result = await supabase
    .from('content_shares')
    .insert(share)
    .select()
    .single();
  return handleResult(result);
}

export async function updateContentShare(
  id: string,
  updates: Partial<ContentShareItem>
): Promise<ContentShareItem> {
  const result = await supabase
    .from('content_shares')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}

export async function deleteContentShare(
  id: string
): Promise<ContentShareItem> {
  const result = await supabase
    .from('content_shares')
    .delete()
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}

// Fetch content shares for a specific user
export async function fetchUserContentShares(
  userId: string
): Promise<ContentShareItem[]> {
  const result = await supabase
    .from('content_shares')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  return result.data || [];
}
