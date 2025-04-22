import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Tutor {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  hourly_rate: number;
  created_at: string;
  active: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  enrollment_date: string;
  payment_status: string;
  created_at: string;
  active: boolean;
}

export interface TutorStudent {
  tutor_id: string;
  tutor_name: string;
  student_id: string;
  student_name: string;
  grade: string;
  subjects: string[];
  payment_status: string;
  assigned_at: string;
  active: boolean;
}

export const fetchTutors = async (): Promise<Tutor[]> => {
  try {
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    toast.error(`Error loading tutors: ${error.message}`);
    return [];
  }
};

export const fetchTutorStudents = async (
  tutorId?: string
): Promise<TutorStudent[]> => {
  try {
    let query = supabase.from('tutor_students').select('*');

    if (tutorId) {
      query = query.eq('tutor_id', tutorId);
    }

    const { data, error } = await query.order('student_name');

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    toast.error(`Error loading tutor students: ${error.message}`);
    return [];
  }
};

export const fetchStudents = async (): Promise<Student[]> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    toast.error(`Error loading students: ${error.message}`);
    return [];
  }
};

export const assignStudentToTutor = async (
  tutorId: string,
  studentId: string,
  assignedBy: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tutor_student_relationships')
      .insert({
        tutor_id: tutorId,
        student_id: studentId,
        assigned_by: assignedBy,
      });

    if (error) throw error;
    toast.success('Student assigned successfully');
    return true;
  } catch (error: any) {
    toast.error(`Error assigning student: ${error.message}`);
    return false;
  }
};

export const removeStudentFromTutor = async (
  tutorId: string,
  studentId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tutor_student_relationships')
      .update({ active: false })
      .eq('tutor_id', tutorId)
      .eq('student_id', studentId);

    if (error) throw error;
    toast.success('Student removed successfully');
    return true;
  } catch (error: any) {
    toast.error(`Error removing student: ${error.message}`);
    return false;
  }
};
