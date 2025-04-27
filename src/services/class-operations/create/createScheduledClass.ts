
import { supabase } from '@/services/supabaseClient';

export interface CreateScheduledClassInput {
  relationship_id: string;
  title: string;
  subject?: string;
  start_time: string;
  end_time: string;
  zoom_link?: string | null;
  notes?: string | null;
}

export async function createScheduledClass(input: CreateScheduledClassInput) {
  const { data, error } = await supabase
    .from('scheduled_classes')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduled class:', error);
    throw error;
  }

  return data;
}
