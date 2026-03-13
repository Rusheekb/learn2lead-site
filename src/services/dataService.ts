
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { Student } from '@/types/sharedTypes';
import { transformDbRecordToClassEvent } from './utils/classEventMapper';
import { logger } from '@/lib/logger';

const log = logger.create('dataService');

interface TutorRecord {
  'Tutor Name'?: string | null;
  [key: string]: any;
}

interface StudentRecord {
  'Student Name'?: string | null;
  Subject?: string | null;
  Date?: string | null;
  [key: string]: any;
}

interface PaymentRecord {
  'Class Number'?: string | null;
  'Tutor Name'?: string | null;
  'Student Name'?: string | null;
  Date?: string | null;
  'Class Cost'?: number | null;
  'Tutor Cost'?: number | null;
  student_payment_date?: string | null;
  tutor_payment_date?: string | null;
  [key: string]: any;
}

export const fetchTutors = async () => {
  const { data, error } = await supabase
    .from('class_logs')
    .select('Tutor Name')
    .order('Tutor Name')
    .not('Tutor Name', 'is', null);

  if (error) {
    log.error('Error fetching tutors', error);
    return [];
  }

  const uniqueTutors = Array.from(
    new Set(data.map((record: TutorRecord) => record['Tutor Name'] || ''))
  )
    .filter(Boolean)
    .sort();

  return uniqueTutors.map((name) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    subjects: [],
    rating: 0,
    classes: 0,
    hourlyRate: 0,
  }));
};

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

export const fetchPaymentsData = async () => {
  const { data, error } = await supabase
    .from('class_logs')
    .select(
      `
      "Class Number",
      "Tutor Name", 
      "Student Name", 
      "Date", 
      "Class Cost", 
      "Tutor Cost", 
      "Student Payment", 
      "Tutor Payment"
    `
    )
    .order('Date', { ascending: false });

  if (error) {
    log.error('Error fetching payments data', error);
    return [];
  }

  return data.map((record: any) => ({
    id: `${record['Class Number'] || ''}`,
    date: record['Date'] || '',
    tutorName: record['Tutor Name'] || '',
    studentName: record['Student Name'] || '',
    classCost: (record['Class Cost'] as number) || 0,
    tutorCost: (record['Tutor Cost'] as number) || 0,
    studentPaymentStatus: 'pending',
    tutorPaymentStatus: 'pending',
  }));
};

export const calculateMetrics = (classes: ClassEvent[]) => {
  const totalClasses = classes.length;
  const uniqueStudents = new Set(classes.map((cls) => cls.studentName)).size;
  const uniqueTutors = new Set(classes.map((cls) => cls.tutorName)).size;

  const totalRevenue = classes.reduce(
    (sum, cls) => sum + (cls.classCost || 0),
    0
  );
  const totalCosts = classes.reduce(
    (sum, cls) => sum + (cls.tutorCost || 0),
    0
  );

  const subjectCounts = classes.reduce(
    (acc, cls) => {
      if (cls.subject) {
        acc[cls.subject] = (acc[cls.subject] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const popularSubjects = Object.entries(subjectCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalClasses,
    uniqueStudents,
    uniqueTutors,
    totalRevenue,
    totalCosts,
    netIncome: totalRevenue - totalCosts,
    popularSubjects,
  };
};
