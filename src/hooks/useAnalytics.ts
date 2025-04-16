
import { useState, useEffect } from 'react';
import { 
  calculateTutorAnalytics, 
  calculateStudentAnalytics, 
  calculateBusinessAnalytics,
  TutorAnalytics,
  StudentAnalytics,
  BusinessAnalytics
} from '@/services/analyticsService';
import { ClassEvent } from '@/types/tutorTypes';

export const useAnalytics = (classes: ClassEvent[]) => {
  const [businessAnalytics, setBusinessAnalytics] = useState<BusinessAnalytics | null>(null);
  const [tutorAnalytics, setTutorAnalytics] = useState<Record<string, TutorAnalytics>>({});
  const [studentAnalytics, setStudentAnalytics] = useState<Record<string, StudentAnalytics>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!classes.length) {
      setIsLoading(false);
      return;
    }

    try {
      console.log("Calculating analytics from", classes.length, "classes");
      
      // Calculate business analytics
      const business = calculateBusinessAnalytics(classes);
      setBusinessAnalytics(business);

      // Calculate analytics for each tutor
      const tutors = new Set(classes.map(cls => cls.tutorName));
      const tutorStats = Array.from(tutors).reduce((acc, tutor) => {
        if (tutor) {
          acc[tutor] = calculateTutorAnalytics(classes, tutor);
        }
        return acc;
      }, {} as Record<string, TutorAnalytics>);
      setTutorAnalytics(tutorStats);

      // Calculate analytics for each student
      const students = new Set(classes.map(cls => cls.studentName));
      const studentStats = Array.from(students).reduce((acc, student) => {
        if (student) {
          acc[student] = calculateStudentAnalytics(classes, student);
        }
        return acc;
      }, {} as Record<string, StudentAnalytics>);
      setStudentAnalytics(studentStats);
    } catch (error) {
      console.error('Error calculating analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [classes]);

  const getTopPerformingTutors = (metric: keyof TutorAnalytics = 'totalClasses', limit: number = 5) => {
    return Object.entries(tutorAnalytics)
      .map(([name, stats]) => ({ name, value: stats[metric] }))
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, limit);
  };

  const getTopPerformingStudents = (metric: keyof StudentAnalytics = 'totalClasses', limit: number = 5) => {
    return Object.entries(studentAnalytics)
      .map(([name, stats]) => ({ name, value: stats[metric] }))
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, limit);
  };

  const getRevenueByMonth = () => {
    return businessAnalytics?.classesPerMonth || {};
  };

  const getSubjectPopularity = () => {
    return businessAnalytics?.mostPopularSubjects || [];
  };

  return {
    isLoading,
    businessAnalytics,
    tutorAnalytics,
    studentAnalytics,
    getTopPerformingTutors,
    getTopPerformingStudents,
    getRevenueByMonth,
    getSubjectPopularity
  };
};
