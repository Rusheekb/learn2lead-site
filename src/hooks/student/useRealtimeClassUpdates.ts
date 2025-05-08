
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import { ClassSession } from '@/types/classTypes';
import { fetchScheduledClasses } from '@/services/classService';
import { toast } from 'sonner';

export function useRealtimeClassUpdates(
  studentId: string | null,
  setSessions: React.Dispatch<React.SetStateAction<ClassSession[]>>,
  queryClient: QueryClient
) {
  useEffect(() => {
    if (!studentId) return;

    // Listen for any changes to scheduled classes for this student
    const channel = supabase
      .channel('student-classes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_classes',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          console.log('Realtime update received for student classes:', payload);
          
          // Refetch the classes when a change occurs
          fetchScheduledClasses(undefined, studentId)
            .then((classEvents) => {
              console.log('Updated student class list received:', classEvents);
              
              const classSessions = classEvents.map((cls) => ({
                id: cls.id,
                title: cls.title,
                subjectId: cls.subject,
                tutorName: cls.tutorName || '',
                date: cls.date,
                startTime: cls.startTime,
                endTime: cls.endTime,
                zoomLink: cls.zoomLink || '',
                recurring: false,
                recurringDays: [],
              }));

              setSessions(classSessions);
              
              // Show notification for new classes
              if (payload.eventType === 'INSERT') {
                const newClass = payload.new;
                toast.success(`New class "${newClass.title}" has been scheduled`);
              }
              
              // Also invalidate any React Query caches
              queryClient.invalidateQueries({ queryKey: ['studentClasses', studentId] });
              queryClient.invalidateQueries({ queryKey: ['upcomingClasses', studentId] });
              queryClient.invalidateQueries({ queryKey: ['studentDashboard', studentId] });
            })
            .catch((error) => {
              console.error('Error updating sessions:', error);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, queryClient, setSessions]);
}
