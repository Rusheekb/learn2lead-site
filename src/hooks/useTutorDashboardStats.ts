import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTutorStudentsByEmail } from '@/services/tutors/tutorStudentsService';
import { format, isToday, isTomorrow, startOfMonth } from 'date-fns';

interface TutorDashboardStats {
  upcomingClassesCount: number;
  nextClassDescription: string;
  activeStudentsCount: number;
  newStudentsThisMonth: number;
  contentSharesCount: number;
  sharedWithStudentsCount: number;
  isLoading: boolean;
  error: string | null;
}

export const useTutorDashboardStats = (): TutorDashboardStats => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TutorDashboardStats>({
    upcomingClassesCount: 0,
    nextClassDescription: 'No classes scheduled',
    activeStudentsCount: 0,
    newStudentsThisMonth: 0,
    contentSharesCount: 0,
    sharedWithStudentsCount: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) {
        setStats(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

        // Fetch all data in parallel
        const [classesResult, studentsResult, sharesResult] = await Promise.all([
          // Upcoming scheduled classes
          supabase
            .from('scheduled_classes')
            .select('id, date, start_time, title')
            .eq('tutor_id', user.id)
            .eq('status', 'scheduled')
            .gte('date', today)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true }),
          
          // Active students via RPC
          fetchTutorStudentsByEmail(),
          
          // Content shares sent by this tutor
          supabase
            .from('content_shares')
            .select('id, receiver_id')
            .eq('sender_id', user.id),
        ]);

        // Process upcoming classes
        let upcomingClassesCount = 0;
        let nextClassDescription = 'No classes scheduled';
        
        if (classesResult.data && classesResult.data.length > 0) {
          upcomingClassesCount = classesResult.data.length;
          const nextClass = classesResult.data[0];
          const classDate = new Date(nextClass.date + 'T00:00:00');
          
          let dayText = format(classDate, 'EEE, MMM d');
          if (isToday(classDate)) {
            dayText = 'Today';
          } else if (isTomorrow(classDate)) {
            dayText = 'Tomorrow';
          }
          
          // Format time from HH:MM:SS to readable format
          const timeParts = nextClass.start_time.split(':');
          const hour = parseInt(timeParts[0], 10);
          const minute = timeParts[1];
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          const timeText = `${hour12}:${minute} ${ampm}`;
          
          nextClassDescription = `Next: ${dayText} at ${timeText}`;
        }

        // Process students
        let activeStudentsCount = 0;
        let newStudentsThisMonth = 0;
        
        if (studentsResult && studentsResult.length > 0) {
          const activeStudents = studentsResult.filter(s => s.active);
          activeStudentsCount = activeStudents.length;
          newStudentsThisMonth = activeStudents.filter(
            s => s.assigned_at >= monthStart
          ).length;
        }

        // Process content shares
        let contentSharesCount = 0;
        let sharedWithStudentsCount = 0;
        
        if (sharesResult.data && sharesResult.data.length > 0) {
          contentSharesCount = sharesResult.data.length;
          // Count unique students shared with
          const uniqueReceivers = new Set(sharesResult.data.map(s => s.receiver_id));
          sharedWithStudentsCount = uniqueReceivers.size;
        }

        setStats({
          upcomingClassesCount,
          nextClassDescription,
          activeStudentsCount,
          newStudentsThisMonth,
          contentSharesCount,
          sharedWithStudentsCount,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching tutor dashboard stats:', error);
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load dashboard stats',
        }));
      }
    };

    fetchStats();
  }, [user?.id]);

  return stats;
};
