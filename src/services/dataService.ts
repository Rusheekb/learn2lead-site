
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types/sharedTypes';
import { logger } from '@/lib/logger';

const log = logger.create('dataService');

interface StudentRecord {
  'Student Name'?: string | null;
  Subject?: string | null;
  Date?: string | null;
  [key: string]: any;
}

export const fetchStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('class_logs')
    .select('Student Name, Subject, Date')
    .order('Student Name')
    .not('Student Name', 'is', null);

  if (error) {
    log.error('Error fetching students', error);
    return [];
  }

  const studentMap = new Map();

  data.forEach((record: StudentRecord) => {
    const name = record['Student Name'];
    if (!name) return;

    const subject = record['Subject'] || '';
    const date = record['Date'] || '';

    if (!studentMap.has(name)) {
      studentMap.set(name, {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        subjects: new Set(),
        lastSession: date,
        nextSession: '',
        progress: '',
      });
    } else {
      const student = studentMap.get(name);

      if (subject) {
        student.subjects.add(subject);
      }

      if (
        date &&
        (!student.lastSession || new Date(date) > new Date(student.lastSession))
      ) {
        student.lastSession = date;
      }
    }
  });

  return Array.from(studentMap.values()).map((student) => ({
    ...student,
    subjects: Array.from(student.subjects),
  }));
};
