
import { supabase } from '@/services/supabaseClient';
import { toast } from 'sonner';

export interface CreateScheduledClassInput {
  relationship_id: string;
  title: string;
  subject?: string;
  start_time: string;
  end_time: string;
  zoom_link: string;
  notes?: string | null;
  date: string; // Added required field
  student_id: string; // Added required field
  tutor_id: string; // Added required field
}

export async function createScheduledClass(input: CreateScheduledClassInput) {
  if (!input.zoom_link) {
    toast.error('Zoom link is required');
    throw new Error('Zoom link is required');
  }

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
