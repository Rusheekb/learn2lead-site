import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types/tutorTypes';
import { toast } from 'sonner';

interface FetchStudentsOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export async function fetchStudents(options: FetchStudentsOptions = {}): Promise<PaginatedResponse<Student>> {
  const { page = 1, pageSize = 10, searchTerm = '' } = options;
  const offset = (page - 1) * pageSize;
  
  // Start with the base query
  let query = supabase.from('students').select('*', { count: 'exact' });

  // Add search condition if provided
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  // Add pagination
  query = query.range(offset, offset + pageSize - 1).order('name');

  const result = await query;

  if (result.error) {
    console.error('Error fetching students:', result.error);
    throw result.error;
  }
  
  // Transform the data to match our Student type
  const students = (result.data || []).map(student => ({
    id: student.id,
    name: student.name,
    email: student.email,
    subjects: student.subjects,
    grade: student.grade, // Allow null values
    active: student.active,
    enrollmentDate: student.enrollment_date,
    paymentStatus: student.payment_status as any
  }));

  return {
    data: students,
    count: result.count || 0,
    page,
    pageSize,
    hasMore: offset + students.length < (result.count || 0)
  };
}

export async function createStudent(student: Omit<Student, 'id'>): Promise<Student> {
  // Validate required fields
  if (!student.name || !student.email) {
    throw new Error('Student name and email are required');
  }

  // Transform our Student type to match the database schema
  const dbStudent = {
    name: student.name,
    email: student.email, 
    subjects: student.subjects || [],
    grade: student.grade, // Allow null values
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
    grade: result.data.grade, // Allow null values
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
    grade: result.data.grade, // Allow null values
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
    grade: result.data.grade, // Allow null values
    active: result.data.active,
    enrollmentDate: result.data.enrollment_date,
    paymentStatus: result.data.payment_status as any
  };
}
