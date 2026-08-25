import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const log = logger.create('studentService');

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

export async function fetchStudents(
  options: FetchStudentsOptions = {}
): Promise<PaginatedResponse<Student>> {
  const { page = 1, pageSize = 10, searchTerm = '' } = options;
  const offset = (page - 1) * pageSize;

  let query = supabase.from('students').select('*', { count: 'exact' });

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  query = query.range(offset, offset + pageSize - 1).order('name');

  const result = await query;

  if (result.error) {
    log.error('Error fetching students', result.error);
    throw result.error;
  }

  const students = (result.data || []).map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    subjects: student.subjects,
    grade: student.grade,
    active: student.active,
    enrollmentDate: student.enrollment_date,
  }));

  return {
    data: students,
    count: result.count || 0,
    page,
    pageSize,
    hasMore: offset + students.length < (result.count || 0),
  };
}

export async function createStudent(
  student: Omit<Student, 'id'>
): Promise<Student> {
  if (!student.name || !student.email) {
    throw new Error('Student name and email are required');
  }

  const dbStudent = {
    name: student.name,
    email: student.email,
    subjects: student.subjects || [],
    grade: student.grade,
    active: student.active !== undefined ? student.active : true,
  };

  const result = await supabase
    .from('students')
    .insert(dbStudent)
    .select()
    .single();

  if (result.error) {
    log.error('Error creating student', result.error);
    throw result.error;
  }

  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects,
    grade: result.data.grade,
    active: result.data.active,
    enrollmentDate: result.data.enrollment_date,
  };
}

export async function updateStudent(
  id: string,
  updates: Partial<Student>
): Promise<Student> {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.subjects !== undefined) dbUpdates.subjects = updates.subjects;
  if (updates.grade !== undefined) dbUpdates.grade = updates.grade;
  if (updates.active !== undefined) dbUpdates.active = updates.active;

  const result = await supabase
    .from('students')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (result.error) {
    log.error('Error updating student', result.error);
    throw result.error;
  }

  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects,
    grade: result.data.grade,
    active: result.data.active,
    enrollmentDate: result.data.enrollment_date,
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
    log.error('Error deleting student', result.error);
    throw result.error;
  }

  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    subjects: result.data.subjects,
    grade: result.data.grade,
    active: result.data.active,
    enrollmentDate: result.data.enrollment_date,
  };
}
