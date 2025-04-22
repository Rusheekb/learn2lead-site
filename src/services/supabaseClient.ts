
import { supabase } from '@/integrations/supabase/client';
import type { 
  ClassEvent, 
  Student,
  ContentShareItem,
  DbClassLog 
} from '@/types/tutorTypes';
import { Profile } from '@/hooks/useProfile';

// Class Logs Operations
export async function fetchClassLogs(): Promise<ClassEvent[]> {
  const { data, error } = await supabase
    .from('class_logs')
    .select('*');

  if (error) {
    console.error('Error fetching class logs:', error);
    throw error;
  }

  return data || [];
}

export async function createClassLog(classLog: Omit<DbClassLog, 'id'>): Promise<ClassEvent> {
  const { data, error } = await supabase
    .from('class_logs')
    .insert(classLog)
    .select()
    .single();

  if (error) {
    console.error('Error creating class log:', error);
    throw error;
  }

  return data;
}

export async function updateClassLog(id: string, updates: Partial<DbClassLog>): Promise<ClassEvent> {
  const { data, error } = await supabase
    .from('class_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating class log:', error);
    throw error;
  }

  return data;
}

export async function deleteClassLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting class log:', error);
    throw error;
  }
}

// Student Operations
export async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*');

  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  return data || [];
}

export async function createStudent(student: Omit<Student, 'id'>): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();

  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }

  return data;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }

  return data;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
}

// Profile Operations
export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}

// Content Shares Operations
export async function fetchContentShares(): Promise<ContentShareItem[]> {
  const { data, error } = await supabase
    .from('content_shares')
    .select('*');

  if (error) {
    console.error('Error fetching content shares:', error);
    throw error;
  }

  return data || [];
}

export async function createContentShare(share: Omit<ContentShareItem, 'id'>): Promise<ContentShareItem> {
  const { data, error } = await supabase
    .from('content_shares')
    .insert(share)
    .select()
    .single();

  if (error) {
    console.error('Error creating content share:', error);
    throw error;
  }

  return data;
}

export async function updateContentShare(id: string, updates: Partial<ContentShareItem>): Promise<ContentShareItem> {
  const { data, error } = await supabase
    .from('content_shares')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating content share:', error);
    throw error;
  }

  return data;
}

export async function deleteContentShare(id: string): Promise<void> {
  const { error } = await supabase
    .from('content_shares')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting content share:', error);
    throw error;
  }
}

// Fetch content shares for a specific user
export async function fetchUserContentShares(userId: string): Promise<ContentShareItem[]> {
  const { data, error } = await supabase
    .from('content_shares')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching user content shares:', error);
    throw error;
  }

  return data || [];
}

