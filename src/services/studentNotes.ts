import { supabase } from '@/integrations/supabase/client';

export interface StudentNote {
  id: string;
  tutor_id: string;
  student_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function fetchStudentNotes(studentId: string): Promise<StudentNote[]> {
  const { data, error } = await supabase
    .from('student_notes')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching student notes:', error);
    throw error;
  }

  return data || [];
}

export async function createStudentNote(
  studentId: string,
  title: string,
  content: string
): Promise<StudentNote> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('student_notes')
    .insert({
      tutor_id: session.session.user.id,
      student_id: studentId,
      title,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating student note:', error);
    throw error;
  }

  return data;
}

export async function updateStudentNote(
  noteId: string,
  title: string,
  content: string
): Promise<StudentNote> {
  const { data, error } = await supabase
    .from('student_notes')
    .update({ title, content })
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating student note:', error);
    throw error;
  }

  return data;
}

export async function deleteStudentNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('student_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting student note:', error);
    throw error;
  }
}