
import { supabase } from '@/integrations/supabase/client';
import type {
  ClassEvent,
  Student as TutorStudent,
  ContentShareItem,
  DbClassLog
} from '@/types/tutorTypes';
import type { Profile } from '@/types/profile';
import type { PostgrestError, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

// Unified result handler for DRY error handling
function handleResult<T>({ data, error }: PostgrestResponse<T> | PostgrestSingleResponse<T>): T {
  if (error) {
    console.error(error);
    throw error;
  }
  if (!data) {
    throw new Error('No data returned');
  }
  return data;
}

// Class Logs Operations
export async function fetchClassLogs(): Promise<ClassEvent[]> {
  const result = await supabase
    .from<ClassEvent>('class_logs')
    .select('*');
  return handleResult<{ [key: string]: ClassEvent[] }>({ data: result.data || [], error: result.error });
}

export async function createClassLog(classLog: Omit<DbClassLog, 'id'>): Promise<ClassEvent> {
  const result = await supabase
    .from<DbClassLog>('class_logs')
    .insert(classLog)
    .select()
    .single();
  return handleResult<ClassEvent>(result);
}

export async function updateClassLog(id: string, updates: Partial<DbClassLog>): Promise<ClassEvent> {
  const result = await supabase
    .from<DbClassLog>('class_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return handleResult<ClassEvent>(result);
}

// Now delete returns the deleted row:
export async function deleteClassLog(id: string): Promise<ClassEvent> {
  const result = await supabase
    .from<DbClassLog>('class_logs')
    .delete()
    .eq('id', id)
    .select()
    .single();
  return handleResult<ClassEvent>(result);
}

// Student Operations
export async function fetchStudents(): Promise<TutorStudent[]> {
  const result = await supabase
    .from<TutorStudent>('students')
    .select('*');
  return handleResult<{ [key: string]: TutorStudent[] }>({ data: result.data || [], error: result.error });
}

export async function createStudent(student: Omit<TutorStudent, 'id'>): Promise<TutorStudent> {
  const result = await supabase
    .from<TutorStudent>('students')
    .insert(student)
    .select()
    .single();
  return handleResult<TutorStudent>(result);
}

export async function updateStudent(id: string, updates: Partial<TutorStudent>): Promise<TutorStudent> {
  const result = await supabase
    .from<TutorStudent>('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return handleResult<TutorStudent>(result);
}

export async function deleteStudent(id: string): Promise<TutorStudent> {
  const result = await supabase
    .from<TutorStudent>('students')
    .delete()
    .eq('id', id)
    .select()
    .single();
  return handleResult<TutorStudent>(result);
}

// Profile Operations
export async function fetchProfile(userId: string): Promise<Profile> {
  const result = await supabase
    .from<Profile>('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return handleResult<Profile>(result);
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const result = await supabase
    .from<Profile>('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return handleResult<Profile>(result);
}

// Content Shares Operations
export async function fetchContentShares(): Promise<ContentShareItem[]> {
  const result = await supabase
    .from<ContentShareItem>('content_shares')
    .select('*');
  return handleResult<{ [key: string]: ContentShareItem[] }>({ data: result.data || [], error: result.error });
}

export async function createContentShare(share: Omit<ContentShareItem, 'id'>): Promise<ContentShareItem> {
  const result = await supabase
    .from<ContentShareItem>('content_shares')
    .insert(share)
    .select()
    .single();
  return handleResult<ContentShareItem>(result);
}

export async function updateContentShare(id: string, updates: Partial<ContentShareItem>): Promise<ContentShareItem> {
  const result = await supabase
    .from<ContentShareItem>('content_shares')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return handleResult<ContentShareItem>(result);
}

export async function deleteContentShare(id: string): Promise<ContentShareItem> {
  const result = await supabase
    .from<ContentShareItem>('content_shares')
    .delete()
    .eq('id', id)
    .select()
    .single();
  return handleResult<ContentShareItem>(result);
}

// Fetch content shares for a specific user
export async function fetchUserContentShares(userId: string): Promise<ContentShareItem[]> {
  const result = await supabase
    .from<ContentShareItem>('content_shares')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  return handleResult<{ [key: string]: ContentShareItem[] }>({ data: result.data || [], error: result.error });
}

