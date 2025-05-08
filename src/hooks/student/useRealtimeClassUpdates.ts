
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import { ClassSession } from '@/types/classTypes';
import { fetchScheduledClasses } from '@/services/classService';

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
        () => {
          // Refetch the classes when a change occurs
          fetchScheduledClasses(undefined, studentId)
            .then((classEvents) => {
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
              
              // Also invalidate any React Query caches
              queryClient.invalidateQueries({ queryKey: ['studentClasses', studentId] });
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
