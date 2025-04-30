
import { supabase } from '@/integrations/supabase/client';
import { Tutor } from '@/types/tutorTypes';
import { toast } from 'sonner';

export async function fetchTutors(): Promise<Tutor[]> {
  const { data, error } = await supabase.from('tutors').select('*');
  console.log('[fetchTutors]', data, error); // Debug log as requested
  
  if (error) {
    console.error('Error fetching tutors:', error);
    throw error;
  }

  console.log('Tutor service fetched data:', data);
  
  // Transform the data to match our Tutor interface
  return (data || []).map(tutor => ({
    id: tutor.id,
    name: tutor.name,
    email: tutor.email,
    subjects: tutor.subjects || [],
    rating: 5, // Default value
    classes: 0, // Default value
    hourlyRate: tutor.hourly_rate || 0,
    active: tutor.active,
  }));
}

export async function createTutor(tutor: Omit<Tutor, 'id'>): Promise<Tutor> {
  // Transform our Tutor type to match the database schema
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
    console.error('Error creating tutor:', result.error);
    throw result.error;
  }
  
  // Transform back to our Tutor interface
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects || [],
    rating: 5, // Default value
    classes: 0, // Default value
    hourlyRate: result.data.hourly_rate || 0,
    active: result.data.active
  };
}

export async function updateTutor(
  id: string,
  updates: Partial<Tutor>
): Promise<Tutor> {
  // Transform our Tutor updates to match the database schema
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
    console.error('Error updating tutor:', result.error);
    throw result.error;
  }
  
  // Transform back to our Tutor interface
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects || [],
    rating: 5, // Default value
    classes: 0, // Default value
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
    console.error('Error deleting tutor:', result.error);
    throw result.error;
  }
  
  // Transform back to our Tutor interface
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects || [],
    rating: 5, // Default value
    classes: 0, // Default value
    hourlyRate: result.data.hourly_rate || 0,
    active: result.data.active
  };
}
