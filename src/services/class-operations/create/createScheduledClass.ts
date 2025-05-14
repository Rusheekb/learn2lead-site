
import { supabase } from '@/services/supabaseClient';
import { toast } from 'sonner';

export interface CreateScheduledClassInput {
  relationship_id: string;
  title: string;
  subject: string; // Changed from optional to required to match DB schema
  start_time: string;
  end_time: string;
  zoom_link: string | null; // Updated to accept null
  notes?: string | null;
  date: string;
  student_id: string;
  tutor_id: string;
}

export async function createScheduledClass(input: CreateScheduledClassInput) {
  if (!input.zoom_link) {
    toast.error('Zoom link is required');
    throw new Error('Zoom link is required');
  }

  // Create a properly formed object that matches the database schema exactly
  const insertData = {
    relationship_id: input.relationship_id,
    title: input.title,
    subject: input.subject,
    start_time: input.start_time,
    end_time: input.end_time,
    zoom_link: input.zoom_link,
    notes: input.notes || null,
    date: input.date,
    student_id: input.student_id,
    tutor_id: input.tutor_id
  };

  const { data, error } = await supabase
    .from('scheduled_classes')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduled class:', error);
    throw error;
  }

  return data;
}
