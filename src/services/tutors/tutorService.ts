import { supabase } from '@/integrations/supabase/client';
import { Tutor } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { PaginatedResponse } from '@/services/students/studentService';
import { logger } from '@/lib/logger';

const log = logger.create('tutorService');

interface FetchTutorsOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}

export async function fetchTutors(options: FetchTutorsOptions = {}): Promise<PaginatedResponse<Tutor>> {
  const { page = 1, pageSize = 10, searchTerm = '' } = options;
  const offset = (page - 1) * pageSize;
  
  let query = supabase.from('tutors').select('*', { count: 'exact' });

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  query = query.range(offset, offset + pageSize - 1).order('name');

  const result = await query;
  
  if (result.error) {
    log.error('Error fetching tutors', result.error);
    throw result.error;
  }
  
  const tutors = (result.data || []).map(tutor => ({
    id: tutor.id,
    name: tutor.name,
    email: tutor.email,
    subjects: tutor.subjects || [],
    rating: 5,
    classes: 0,
    hourlyRate: tutor.hourly_rate || 0,
    active: tutor.active,
  }));

  return {
    data: tutors,
    count: result.count || 0,
    page,
    pageSize,
    hasMore: offset + tutors.length < (result.count || 0)
  };
}

export async function createTutor(tutor: Omit<Tutor, 'id'>): Promise<Tutor> {
  const dbTutor = {
    name: tutor.name,
    email: tutor.email,
    subjects: tutor.subjects || [],
    hourly_rate: tutor.hourlyRate,
    active: tutor.active !== undefined ? tutor.active : true
  };
  
  const result = await supabase
    .from('tutors')
    .insert(dbTutor)
    .select()
    .single();
  
  if (result.error) {
    log.error('Error creating tutor', result.error);
    throw result.error;
  }
  
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects || [],
    rating: 5,
    classes: 0,
    hourlyRate: result.data.hourly_rate || 0,
    active: result.data.active
  };
}

export async function updateTutor(
  id: string,
  updates: Partial<Tutor>
): Promise<Tutor> {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.subjects !== undefined) dbUpdates.subjects = updates.subjects;
  if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
  if (updates.active !== undefined) dbUpdates.active = updates.active;
  
  const result = await supabase
    .from('tutors')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    log.error('Error updating tutor', result.error);
    throw result.error;
  }
  
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects || [],
    rating: 5,
    classes: 0,
    hourlyRate: result.data.hourly_rate || 0,
    active: result.data.active
  };
}

export async function deleteTutor(id: string): Promise<Tutor> {
  const result = await supabase
    .from('tutors')
    .delete()
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    log.error('Error deleting tutor', result.error);
    throw result.error;
  }
  
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects || [],
    rating: 5,
    classes: 0,
    hourlyRate: result.data.hourly_rate || 0,
    active: result.data.active
  };
}
