import { supabase } from '@/services/supabaseClient';
import { toast } from 'sonner';
import { TutorStudentAssignment } from './types';

async function resolveProfileIdFromTutorId(tutorId: string): Promise<string | null> {
  // If already a profile id, return as-is
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', tutorId)
    .maybeSingle();
  if (existing?.id) return tutorId;

  // Otherwise, map tutors.id -> tutors.email -> profiles.id
  const { data: tutor } = await supabase
    .from('tutors')
    .select('email')
    .eq('id', tutorId)
    .maybeSingle();
  if (!tutor?.email) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', tutor.email)
    .maybeSingle();
  return profile?.id ?? null;
}

async function resolveProfileIdFromStudentId(studentId: string): Promise<string | null> {
  // If already a profile id, return as-is
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', studentId)
    .maybeSingle();
  if (existing?.id) return studentId;

  // Otherwise, map students.id -> students.email -> profiles.id
  const { data: student } = await supabase
    .from('students')
    .select('email')
    .eq('id', studentId)
    .maybeSingle();
  if (!student?.email) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', student.email)
    .maybeSingle();
  return profile?.id ?? null;
}

export async function createAssignment(input: {
  tutor_id: string;
  student_id: string;
}) {
  console.log('Creating assignment with input:', input);

  // The input should now already contain profile IDs, but let's add a fallback
  const mappedTutorId = await resolveProfileIdFromTutorId(input.tutor_id);
  const mappedStudentId = await resolveProfileIdFromStudentId(input.student_id);

  if (!mappedTutorId || !mappedStudentId) {
    console.error('Mapping to profile IDs failed', { mappedTutorId, mappedStudentId, input });
    toast.error('Could not resolve selected users');
    throw new Error('Failed to resolve profile IDs for assignment');
  }

  console.log('Final assignment data:', { tutor_id: mappedTutorId, student_id: mappedStudentId });

  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .insert({ tutor_id: mappedTutorId, student_id: mappedStudentId, active: true })
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }

  toast.success('Tutor-student assignment created successfully');
  return data as TutorStudentAssignment;
}

export async function endAssignment(id: string) {
  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error ending assignment:', error);
    throw error;
  }

  toast.success('Tutor-student assignment ended successfully');
  return data as TutorStudentAssignment;
}