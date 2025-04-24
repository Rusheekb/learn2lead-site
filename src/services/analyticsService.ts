import { ClassEvent, PaymentStatus } from '@/types/tutorTypes';
import { supabase } from '@/integrations/supabase/client';

export interface TutorAnalytics {
  totalClasses: number;
  totalHours: number;
  totalEarnings: number;
  averageClassDuration: number;
  subjectBreakdown: Record<string, number>;
  studentCount: number;
  paymentRate: number;
}

export interface StudentAnalytics {
  totalClasses: number;
  totalHours: number;
  totalSpent: number;
  averageClassDuration: number;
  subjectBreakdown: Record<string, number>;
  completedHomeworkRate: number;
  attendanceRate: number;
}

export interface BusinessAnalytics {
  totalRevenue: number;
  totalCosts: number;
  netIncome: number;
  averageClassCost: number;
  mostPopularSubjects: Array<{ subject: string; count: number }>;
  studentRetentionRate: number;
  classesPerMonth: Record<string, number>;
}

const safeNumber = (value: number | undefined | null): number => {
  return typeof value === 'number' && !isNaN(value) ? value : 0;
};

export const calculateTutorAnalytics = (
  classes: ClassEvent[],
  tutorName: string
): TutorAnalytics => {
  const tutorClasses = classes.filter((cls) => cls.tutorName === tutorName);

  const totalClasses = tutorClasses.length;
  const totalHours = tutorClasses.reduce(
    (sum, cls) => sum + safeNumber(cls.duration),
    0
  );
  const totalEarnings = tutorClasses.reduce(
    (sum, cls) => sum + safeNumber(cls.tutorCost),
    0
  );

  const subjectBreakdown = tutorClasses.reduce(
    (acc, cls) => {
      if (cls.subject) {
        acc[cls.subject] = (acc[cls.subject] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const uniqueStudents = new Set(tutorClasses.map((cls) => cls.studentName))
    .size;
  const paidClasses = tutorClasses.filter(
    (cls) => cls.tutorPayment === 'paid'
  ).length;

  return {
    totalClasses,
    totalHours,
    totalEarnings,
    averageClassDuration: totalClasses > 0 ? totalHours / totalClasses : 0,
    subjectBreakdown,
    studentCount: uniqueStudents,
    paymentRate: totalClasses > 0 ? (paidClasses / totalClasses) * 100 : 0,
  };
};

export const calculateStudentAnalytics = (
  classes: ClassEvent[],
  studentName: string
): StudentAnalytics => {
  const studentClasses = classes.filter(
    (cls) => cls.studentName === studentName
  );

  const totalClasses = studentClasses.length;
  const totalHours = studentClasses.reduce(
    (sum, cls) => sum + safeNumber(cls.duration),
    0
  );
  const totalSpent = studentClasses.reduce(
    (sum, cls) => sum + safeNumber(cls.classCost),
    0
  );

  const subjectBreakdown = studentClasses.reduce(
    (acc, cls) => {
      if (cls.subject) {
        acc[cls.subject] = (acc[cls.subject] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const completedHomework = studentClasses.filter(
    (cls) =>
      cls.homework?.toLowerCase().includes('completed') ||
      cls.notes?.toLowerCase().includes('homework completed')
  ).length;

  const attendedClasses = studentClasses.filter(
    (cls) =>
      cls.status === 'completed' ||
      (cls.notes?.toLowerCase().includes('attended') &&
        !cls.notes?.toLowerCase().includes('not attended'))
  ).length;

  return {
    totalClasses,
    totalHours,
    totalSpent,
    averageClassDuration: totalClasses > 0 ? totalHours / totalClasses : 0,
    subjectBreakdown,
    completedHomeworkRate:
      totalClasses > 0 ? (completedHomework / totalClasses) * 100 : 0,
    attendanceRate:
      totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0,
  };
};

export const calculateBusinessAnalytics = (
  classes: ClassEvent[]
): BusinessAnalytics => {
  const totalRevenue = classes.reduce(
    (sum, cls) => sum + safeNumber(cls.classCost),
    0
  );
  const totalCosts = classes.reduce(
    (sum, cls) => sum + safeNumber(cls.tutorCost),
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

  const mostPopularSubjects = Object.entries(subjectCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const classesPerMonth = classes.reduce(
    (acc, cls) => {
      if (cls.date) {
        const month = new Date(cls.date).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        });
        acc[month] = (acc[month] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate student retention (students with more than one class)
  const studentClassCounts = classes.reduce(
    (acc, cls) => {
      if (cls.studentName) {
        acc[cls.studentName] = (acc[cls.studentName] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const retainedStudents = Object.values(studentClassCounts).filter(
    (count) => count > 1
  ).length;
  const totalStudents = Object.keys(studentClassCounts).length;

  return {
    totalRevenue,
    totalCosts,
    netIncome: totalRevenue - totalCosts,
    averageClassCost: classes.length > 0 ? totalRevenue / classes.length : 0,
    mostPopularSubjects,
    studentRetentionRate:
      totalStudents > 0 ? (retainedStudents / totalStudents) * 100 : 0,
    classesPerMonth,
  };
};

export async function fetchStudentAnalytics(studentId: string) {
  const { data, error, count } = await supabase
    .from('class_logs')
    .select('Time (hrs)', { count: 'exact' })
    .eq('Student Name', studentId);

  if (error) throw error;

  const totalSessions = count || 0;
  const avgDuration = data && data.length
    ? Math.round(data.reduce((sum: number, r: { 'Time (hrs)': string | number }) => sum + (Number(r['Time (hrs)']) || 0), 0) / data.length * 60)
    : 0;

  return { totalSessions, avgDuration };
}

export async function fetchTutorAnalytics(tutorId: string) {
  const { data, error, count } = await supabase
    .from('class_logs')
    .select('Time (hrs)', { count: 'exact' })
    .eq('Tutor Name', tutorId);

  if (error) throw error;

  const totalSessions = count || 0;
  const avgDuration = data && data.length
    ? Math.round(data.reduce((sum: number, r: { 'Time (hrs)': string | number }) => sum + (Number(r['Time (hrs)']) || 0), 0) / data.length * 60)
    : 0;

  return { totalSessions, avgDuration };
}
