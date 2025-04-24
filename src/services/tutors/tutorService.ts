import { supabase } from '@/integrations/supabase/client';
import { Tutor } from '@/types/tutorTypes';
import { toast } from 'sonner';

export async function fetchTutors(): Promise<Tutor[]> {
  const { data, error } = await supabase.from('tutors').select('*');
  
  if (error) {
    console.error('Error fetching tutors:', error);
    throw error;
  }

  console.log('Tutor service fetched data:', data);
  return data || [];
}

export async function createTutor(tutor: Omit<Tutor, 'id'>): Promise<Tutor> {
  const result = await supabase
    .from('tutors')
    .insert(tutor)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error creating tutor:', result.error);
    throw result.error;
  }
  
  return result.data;
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
  
  if (result.error) {
    console.error('Error updating tutor:', result.error);
    throw result.error;
  }
  
  return result.data;
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
  
  return result.data;
}
