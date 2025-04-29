
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types/tutorTypes';
import { toast } from 'sonner';

export async function fetchStudents(): Promise<Student[]> {
  const result = await supabase.from('students').select('*');

  if (result.error) {
    console.error('Error fetching students:', result.error);
    throw result.error;
  }

  // Transform the data to match our Student type
  return (result.data || []).map(student => ({
    id: student.id,
    name: student.name,
    email: student.email,
    subjects: student.subjects,
    grade: student.grade,
    active: student.active,
    enrollmentDate: student.enrollment_date,
    paymentStatus: student.payment_status as any
  }));
}

export async function createStudent(student: Omit<Student, 'id'>): Promise<Student> {
  // Transform our Student type to match the database schema
  const dbStudent = {
    name: student.name,
    email: student.email, 
    subjects: student.subjects || [],
    grade: student.grade || null,
    active: student.active !== undefined ? student.active : true,
    payment_status: student.paymentStatus || 'pending'
  };
  
  const result = await supabase
    .from('students')
    .insert(dbStudent)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error creating student:', result.error);
    throw result.error;
  }
  
  // Transform back to our Student type
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects,
    grade: result.data.grade,
    active: result.data.active,
    enrollmentDate: result.data.enrollment_date,
    paymentStatus: result.data.payment_status as any
  };
}

export async function updateStudent(
  id: string,
  updates: Partial<Student>
): Promise<Student> {
  // Transform our Student type to match the database schema
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.subjects !== undefined) dbUpdates.subjects = updates.subjects;
  if (updates.grade !== undefined) dbUpdates.grade = updates.grade;
  if (updates.active !== undefined) dbUpdates.active = updates.active;
  if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
  
  const result = await supabase
    .from('students')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error updating student:', result.error);
    throw result.error;
  }
  
  // Transform back to our Student type
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects,
    grade: result.data.grade,
    active: result.data.active,
    enrollmentDate: result.data.enrollment_date,
    paymentStatus: result.data.payment_status as any
  };
}

export async function deleteStudent(id: string): Promise<Student> {
  const result = await supabase
    .from('students')
    .delete()
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error deleting student:', result.error);
    throw result.error;
  }
  
  // Transform back to our Student type
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects,
    grade: result.data.grade,
    active: result.data.active,
    enrollmentDate: result.data.enrollment_date,
    paymentStatus: result.data.payment_status as any
  };
}
