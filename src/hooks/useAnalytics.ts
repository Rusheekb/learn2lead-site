
import { useState, useEffect } from 'react';
import {
  calculateTutorAnalytics,
  calculateStudentAnalytics,
  calculateBusinessAnalytics,
  TutorAnalytics,
  StudentAnalytics,
  BusinessAnalytics,
} from '@/services/analyticsService';
import { ClassEvent } from '@/types/tutorTypes';

export const useAnalytics = (classes: ClassEvent[]) => {
  const [businessAnalytics, setBusinessAnalytics] =
    useState<BusinessAnalytics | null>(null);
  const [tutorAnalytics, setTutorAnalytics] = useState<
    Record<string, TutorAnalytics>
  >({});
  const [studentAnalytics, setStudentAnalytics] = useState<
    Record<string, StudentAnalytics>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyClasses, setWeeklyClasses] = useState<{name: string, classes: number}[]>([]);

  useEffect(() => {
    if (!classes.length) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('Calculating analytics from', classes.length, 'classes');

      // Calculate business analytics
      const business = calculateBusinessAnalytics(classes);
      setBusinessAnalytics(business);

      // Calculate analytics for each tutor
      const tutors = new Set(classes.map((cls) => cls.tutorName));
      const tutorStats = Array.from(tutors).reduce(
        (acc, tutor) => {
          if (tutor) {
            acc[tutor] = calculateTutorAnalytics(classes, tutor);
          }
          return acc;
        },
        {} as Record<string, TutorAnalytics>
      );
      setTutorAnalytics(tutorStats);

      // Calculate analytics for each student
      const students = new Set(classes.map((cls) => cls.studentName));
      const studentStats = Array.from(students).reduce(
        (acc, student) => {
          if (student) {
            acc[student] = calculateStudentAnalytics(classes, student);
          }
          return acc;
        },
        {} as Record<string, StudentAnalytics>
      );
      setStudentAnalytics(studentStats);

      // Calculate weekly classes for the last 12 weeks
      calculateWeeklyClasses(classes);
    } catch (error) {
      console.error('Error calculating analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [classes]);

  // Calculate weekly classes for chart
  const calculateWeeklyClasses = (classes: ClassEvent[]) => {
    // Generate the last 12 weeks
    const now = new Date();
    const weeks: { [key: string]: number } = {};
    
    // Initialize the last 12 weeks with 0 classes
    for (let i = 11; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() - (i * 7));
      const weekNumber = getWeekNumber(weekDate);
      const weekLabel = `Week ${weekNumber}`;
      weeks[weekLabel] = 0;
    }
    
    // Count classes per week
    classes.forEach((cls) => {
      if (!cls.date) return;
      
      const classDate = new Date(cls.date);
      // Only count classes from the last 12 weeks
      const weeksDiff = getWeeksDiff(classDate, now);
      if (weeksDiff <= 12 && weeksDiff >= 0) {
        const weekNumber = getWeekNumber(classDate);
        const weekLabel = `Week ${weekNumber}`;
        weeks[weekLabel] = (weeks[weekLabel] || 0) + 1;
      }
    });
    
    // Convert to array for recharts
    const weeklyData = Object.entries(weeks).map(([name, classes]) => ({
      name,
      classes,
    }));
    
    setWeeklyClasses(weeklyData);
  };
  
  // Helper function to get week number
  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };
  
  // Helper function to get number of weeks between two dates
  const getWeeksDiff = (startDate: Date, endDate: Date) => {
    const millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerWeek);
  };

  // Ensure this returns number only for value, not objects
  const getTopPerformingTutors = (
    metric: keyof TutorAnalytics = 'totalClasses',
    limit: number = 5
  ) => {
    return Object.entries(tutorAnalytics)
      .map(([name, stats]) => {
        const value = stats[metric];
        return {
          name,
          value: typeof value === 'number' ? value : 0,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  };

  // Ensure this returns number only for value, not objects
  const getTopPerformingStudents = (
    metric: keyof StudentAnalytics = 'totalClasses',
    limit: number = 5
  ) => {
    return Object.entries(studentAnalytics)
      .map(([name, stats]) => {
        const value = stats[metric];
        return {
          name,
          value: typeof value === 'number' ? value : 0,
        };
      })
      .sort((a, b) => b.value - a.value)
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
    weeklyClasses,
    getTopPerformingTutors,
    getTopPerformingStudents,
    getRevenueByMonth,
    getSubjectPopularity,
  };
};
