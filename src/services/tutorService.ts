
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
  // Add properties required by the Tutor interface
  rating: number;
  classes: number;
  hourlyRate: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string | null; // Changed to allow null values
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
  grade: string | null; // Changed to allow null values
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
    
    // Transform database tutor records to match our Tutor interface
    return (data || []).map(tutor => ({
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      subjects: tutor.subjects || [],
      hourly_rate: tutor.hourly_rate || 0,
      created_at: tutor.created_at,
      active: tutor.active,
      // Add default values for required fields
      rating: 5, // Default values for required fields in the Tutor interface
      classes: 0,
      hourlyRate: tutor.hourly_rate || 0,
    }));
  } catch (error: any) {
    toast.error(`Error loading tutors: ${error.message}`);
    return [];
  }
};

export const fetchTutorStudents = async (
  tutorId?: string
): Promise<TutorStudent[]> => {
  try {
    let query = supabase.from('tutor_student_assigned').select(`
      *,
      student:students(name, subjects, grade, payment_status)
    `);

    if (tutorId) {
      query = query.eq('tutor_id', tutorId);
    }

    const { data, error } = await query.order('student_name');

    if (error) throw error;
    
    // Transform data to ensure it matches our TutorStudent interface
    return (data || []).map((item: any) => {
      const s = item?.student as any;
      return {
        tutor_id: item.tutor_id || '',
        tutor_name: 'Tutor', // Simplified since we can't get tutor name easily
        student_id: item.student_id || '',
        student_name: s?.name || '',
        grade: s?.grade ?? null,
        subjects: s?.subjects || [],
        payment_status: s?.payment_status || 'pending',
        assigned_at: item.assigned_at || new Date().toISOString(),
        active: item.active ?? true,
      } as TutorStudent;
    });
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
    
    // Transform data to match our Student interface
    return (data || []).map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      grade: student.grade, // Allow null
      subjects: student.subjects,
      enrollment_date: student.enrollment_date || '',
      payment_status: student.payment_status,
      created_at: student.created_at,
      active: student.active,
    }));
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
      .from('tutor_student_assigned')
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
      .from('tutor_student_assigned')
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
