import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TutorStudentAssignment } from './types';
import { logger } from '@/lib/logger';

const log = logger.create('assignments');

async function resolveProfileIdFromTutorId(tutorId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', tutorId)
    .maybeSingle();
  if (existing?.id) return tutorId;

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
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', studentId)
    .maybeSingle();
  if (existing?.id) return studentId;

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
  log.debug('Creating assignment with input', input);

  const mappedTutorId = await resolveProfileIdFromTutorId(input.tutor_id);
  const mappedStudentId = await resolveProfileIdFromStudentId(input.student_id);

  if (!mappedTutorId || !mappedStudentId) {
    log.error('Mapping to profile IDs failed', undefined, { mappedTutorId, mappedStudentId, input });
    toast.error('Could not resolve selected users');
    throw new Error('Failed to resolve profile IDs for assignment');
  }

  log.debug('Final assignment data', { tutor_id: mappedTutorId, student_id: mappedStudentId });

  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .insert({ tutor_id: mappedTutorId, student_id: mappedStudentId, active: true })
    .select()
    .single();

  if (error) {
    log.error('Error creating assignment', error);
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
    log.error('Error ending assignment', error);
    throw error;
  }

  toast.success('Tutor-student assignment ended successfully');
  return data as TutorStudentAssignment;
}
