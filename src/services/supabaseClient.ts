
import { supabase } from '@/integrations/supabase/client';
import type {
  ClassEvent,
  Student,
  Tutor,
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
  return result.data || [];
}

export async function createClassLog(
  classLog: Omit<DbClassLog, 'id'>
): Promise<ClassEvent> {
  const result = await supabase
    .from('class_logs')
    .insert(classLog)
    .select()
    .single();
  return handleResult(result);
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
export async function fetchStudents(): Promise<Student[]> {
  const result = await supabase.from('students').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  return result.data || [];
}

export async function createStudent(
  student: Omit<Student, 'id'>
): Promise<Student> {
  const result = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
  return handleResult(result);
}

export async function updateStudent(
  id: string,
  updates: Partial<Student>
): Promise<Student> {
  const result = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}

export async function deleteStudent(
  id: string
): Promise<Student> {
  const result = await supabase
    .from('students')
    .delete()
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}

// Tutor Operations
export async function fetchTutors(): Promise<Tutor[]> {
  const result = await supabase.from('tutors').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  return result.data || [];
}

export async function createTutor(
  tutor: Omit<Tutor, 'id'>
): Promise<Tutor> {
  const result = await supabase
    .from('tutors')
    .insert(tutor)
    .select()
    .single();
  return handleResult(result);
}

export async function updateTutor(
  id: string,
  updates: Partial<Tutor>
): Promise<Tutor> {
  const result = await supabase
    .from('tutors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return handleResult(result);
}

export async function deleteTutor(
  id: string
): Promise<Tutor> {
  const result = await supabase
    .from('tutors')
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
