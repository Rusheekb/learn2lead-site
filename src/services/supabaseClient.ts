import { supabase } from '@/integrations/supabase/client';
export { supabase }; //

import type {
  ClassEvent,
  Student as TutorStudent,
  ContentShareItem,
  DbClassLog,
} from '@/types/tutorTypes';
import type { Profile } from '@/types/profile';
import type {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';

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
  // This will be handled in the classEventMapper.ts file
  return result.data ? result.data.map(record => {
    // Basic mapping here - detailed mapping should be in a utility function
    return {
      id: record.id,
      title: record["Class Number"] || "",
      tutorName: record["Tutor Name"] || "",
      studentName: record["Student Name"] || "",
      date: record.Date || new Date().toISOString(),
      startTime: record["Time (CST)"] || "",
      endTime: "", // Calculate this or set a default
      duration: parseInt(record["Time (hrs)"] || "0"),
      subject: record.Subject || "",
      content: record.Content || "",
      homework: record.HW || "",
      status: "completed" as any,
      attendance: "present" as any,
      zoomLink: null,
      notes: record["Additional Info"] || "",
      classCost: parseFloat(record["Class Cost"] || "0"),
      tutorCost: parseFloat(record["Tutor Cost"] || "0"),
      studentPayment: record["Student Payment"] as any || "pending",
      tutorPayment: record["Tutor Payment"] as any || "pending",
    } as ClassEvent;
  }) : [];
}

export async function createClassLog(
  classLog: Record<string, any>
): Promise<ClassEvent> {
  const result = await supabase
    .from('class_logs')
    .insert(classLog)
    .select()
    .single();
  
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  
  // Transform the DB record to a ClassEvent
  return {
    id: result.data.id,
    title: result.data["Class Number"] || "",
    tutorName: result.data["Tutor Name"] || "",
    studentName: result.data["Student Name"] || "",
    date: result.data.Date || new Date().toISOString(),
    startTime: result.data["Time (CST)"] || "",
    endTime: "", // Calculate this or set a default
    duration: parseInt(result.data["Time (hrs)"] || "0"),
    subject: result.data.Subject || "",
    content: result.data.Content || "",
    homework: result.data.HW || "",
    status: "completed" as any,
    attendance: "present" as any,
    zoomLink: null,
    notes: result.data["Additional Info"] || "",
    classCost: parseFloat(result.data["Class Cost"] || "0"),
    tutorCost: parseFloat(result.data["Tutor Cost"] || "0"),
    studentPayment: result.data["Student Payment"] as any || "pending",
    tutorPayment: result.data["Tutor Payment"] as any || "pending",
  } as ClassEvent;
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
  return handleResult(result);
}

// Now delete returns the deleted row:
export async function deleteClassLog(id: string): Promise<ClassEvent> {
  const result = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
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
