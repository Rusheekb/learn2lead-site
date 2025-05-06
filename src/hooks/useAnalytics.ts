
import { useMemo } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { TopPerformer } from '@/types/sharedTypes';
import { analytics, BusinessAnalytics } from '@/services/analyticsService';
import { parseNumericString } from '@/utils/numberUtils';
import { subDays, addDays, format, isWithinInterval } from 'date-fns';

type PerformanceCriteria = 'totalClasses' | 'revenue' | 'rating';

export const useAnalytics = (classes: ClassEvent[]) => {
  const isLoading = classes.length === 0;
  
  // Calculate business analytics using the analytics service
  const businessAnalytics = useMemo<BusinessAnalytics>(() => {
    return analytics.calculateBusinessAnalytics(classes);
  }, [classes]);
  
  // Calculate weekly class distribution for the chart
  const weeklyClasses = useMemo(() => {
    const today = new Date();
    const oneWeekAgo = subDays(today, 7);
    
    // Initialize an array for each day of the week
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(oneWeekAgo, i + 1);
      return {
        name: format(date, 'EEE'),
        date: format(date, 'yyyy-MM-dd'),
        classes: 0,
        revenue: 0
      };
    });
    
    // Count classes for each day
    classes.forEach(classEvent => {
      const classDate = new Date(classEvent.date);
      if (isWithinInterval(classDate, { start: oneWeekAgo, end: today })) {
        const dayIndex = days.findIndex(d => d.date === format(classDate, 'yyyy-MM-dd'));
        if (dayIndex >= 0) {
          days[dayIndex].classes += 1;
          days[dayIndex].revenue += classEvent.classCost || 0;
        }
      }
    });
    
    return days;
  }, [classes]);
  
  // Get top performing tutors based on criteria
  const getTopPerformingTutors = (criteria: PerformanceCriteria = 'totalClasses'): TopPerformer[] => {
    const tutorStats = new Map<string, { name: string, classes: number, revenue: number }>();
    
    classes.forEach(classEvent => {
      if (!classEvent.tutorName) return;
      
      const stats = tutorStats.get(classEvent.tutorName) || { 
        name: classEvent.tutorName, 
        classes: 0, 
        revenue: 0 
      };
      
      stats.classes += 1;
      stats.revenue += classEvent.classCost || 0;
      
      tutorStats.set(classEvent.tutorName, stats);
    });
    
    const tutors = Array.from(tutorStats.values()).map(stats => ({
      name: stats.name,
      value: criteria === 'revenue' ? stats.revenue : stats.classes,
      metric: criteria === 'revenue' ? 'revenue' : 'classes'
    }));
    
    return tutors.sort((a, b) => b.value - a.value).slice(0, 5);
  };
  
  // Get top performing students based on criteria
  const getTopPerformingStudents = (criteria: PerformanceCriteria = 'totalClasses'): TopPerformer[] => {
    const studentStats = new Map<string, { name: string, classes: number, spending: number }>();
    
    classes.forEach(classEvent => {
      if (!classEvent.studentName) return;
      
      const stats = studentStats.get(classEvent.studentName) || { 
        name: classEvent.studentName, 
        classes: 0, 
        spending: 0 
      };
      
      stats.classes += 1;
      stats.spending += classEvent.classCost || 0;
      
      studentStats.set(classEvent.studentName, stats);
    });
    
    const students = Array.from(studentStats.values()).map(stats => ({
      name: stats.name,
      value: criteria === 'revenue' ? stats.spending : stats.classes,
      metric: criteria === 'revenue' ? 'spending' : 'classes'
    }));
    
    return students.sort((a, b) => b.value - a.value).slice(0, 5);
  };
  
  // Get monthly revenue distribution
  const getRevenueByMonth = () => {
    const monthlyData: Record<string, number> = {};
    
    classes.forEach(classEvent => {
      if (!classEvent.date) return;
      
      const date = new Date(classEvent.date);
      const monthKey = format(date, 'MMM yyyy');
      
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
    
    return monthlyData;
  };
  
  // Get subject popularity
  const getSubjectPopularity = () => {
    const subjects = new Map<string, number>();
    
    classes.forEach(classEvent => {
      if (!classEvent.subject) return;
      
      const count = subjects.get(classEvent.subject) || 0;
      subjects.set(classEvent.subject, count + 1);
    });
    
    return Array.from(subjects.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);
  };
  
  return {
    isLoading,
    businessAnalytics,
    weeklyClasses,
    getTopPerformingTutors,
    getTopPerformingStudents,
    getRevenueByMonth,
    getSubjectPopularity
  };
};

export default useAnalytics;
