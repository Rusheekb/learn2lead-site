
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

    console.log(`Setting up realtime subscription for student: ${studentId}`);

    // Listen for any changes to scheduled classes for this student
    const channel = supabase
      .channel(`student-classes-${studentId}`)
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
              
              // Show notification based on event type
              if (payload.eventType === 'INSERT') {
                const newClass = payload.new;
                toast.success(`New class "${newClass.title}" has been scheduled`);
              } else if (payload.eventType === 'UPDATE') {
                const updatedClass = payload.new;
                toast.info(`Class "${updatedClass.title}" has been updated`);
              } else if (payload.eventType === 'DELETE') {
                toast.info('A class has been cancelled');
              }
              
              // Also invalidate all React Query caches related to student classes
              queryClient.invalidateQueries({ queryKey: ['studentClasses', studentId] });
              queryClient.invalidateQueries({ queryKey: ['upcomingClasses', studentId] });
              queryClient.invalidateQueries({ queryKey: ['studentDashboard', studentId] });
            })
            .catch((error) => {
              console.error('Error updating sessions:', error);
              toast.error('Could not update class schedule');
            });
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for student ${studentId}:`, status);
      });

    // Cleanup function to remove the channel subscription
    return () => {
      console.log(`Removing channel for student ${studentId}`);
      supabase.removeChannel(channel);
    };
  }, [studentId, queryClient, setSessions]);
}
