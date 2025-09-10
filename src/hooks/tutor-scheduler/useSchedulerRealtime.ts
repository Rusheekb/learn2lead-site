import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parse } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

function useSchedulerRealtime(
  scheduledClasses: ClassEvent[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>,
  selectedEvent: ClassEvent | null,
  setSelectedEvent: React.Dispatch<React.SetStateAction<ClassEvent | null>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('Setting up consolidated realtime subscription for tutor:', user.id);
    
    // Create a single channel with multiple subscriptions to prevent conflicts
    const channel = supabase
      .channel(`tutor-scheduler-${user.id}`)
      // Subscribe to scheduled_classes changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_classes',
          filter: `tutor_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime update for scheduled classes:', payload);
          
          try {
            if (payload.eventType === 'INSERT') {
              const newClass = payload.new;
              if (!newClass) return;
              
              // Check for duplicate - prevent adding if class already exists
              const classExists = scheduledClasses.some(cls => cls.id === newClass.id);
              if (classExists) {
                console.log('Class already exists, skipping duplicate insertion:', newClass.id);
                return;
              }
              
              toast.success(`New class "${newClass.title}" has been scheduled`);
              
              // Convert database record to ClassEvent
              const newClassEvent: ClassEvent = {
                id: newClass.id || '',
                title: newClass.title || '',
                tutorName: newClass.tutor_name || '',
                studentName: newClass.student_name || '',
                date: newClass.date
                  ? parse(newClass.date, 'yyyy-MM-dd', new Date())
                  : new Date(),
                startTime: newClass.start_time ? newClass.start_time.substring(0, 5) : '',
                endTime: newClass.end_time ? newClass.end_time.substring(0, 5) : '',
                subject: newClass.subject || '',
                zoomLink: newClass.zoom_link || '',
                notes: newClass.notes || '',
                status: newClass.status || 'scheduled',
                attendance: newClass.attendance || 'pending',
                studentId: newClass.student_id || '',
                tutorId: newClass.tutor_id || '',
                relationshipId: newClass.relationship_id || '',
                recurring: false,
                materials: [],
              };
              
              setScheduledClasses((prev) => [...prev, newClassEvent]);
              
              // If this is the event we're currently viewing, update it
              if (selectedEvent && selectedEvent.id === newClass.id) {
                setSelectedEvent(newClassEvent);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedClass = payload.new;
              if (!updatedClass || !updatedClass.id) return;
              
              toast.info(`Class "${updatedClass.title}" has been updated`);
              
              setScheduledClasses((prev) =>
                prev.map((cls) => {
                  if (cls.id === updatedClass.id) {
                    // Convert database record to ClassEvent
                    return {
                      ...cls,
                      title: updatedClass.title || cls.title,
                      date: updatedClass.date
                        ? parse(updatedClass.date, 'yyyy-MM-dd', new Date())
                        : cls.date,
                      startTime: updatedClass.start_time ? updatedClass.start_time.substring(0, 5) : cls.startTime,
                      endTime: updatedClass.end_time ? updatedClass.end_time.substring(0, 5) : cls.endTime,
                      subject: updatedClass.subject || cls.subject,
                      zoomLink: updatedClass.zoom_link || '',
                      notes: updatedClass.notes || '',
                      status: updatedClass.status || cls.status,
                      attendance: updatedClass.attendance || cls.attendance,
                      relationshipId: updatedClass.relationship_id || cls.relationshipId,
                    };
                  }
                  return cls;
                })
              );
              
              // If this is the event we're currently viewing, update it
              if (selectedEvent && selectedEvent.id === updatedClass.id) {
                setSelectedEvent((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    title: updatedClass.title || prev.title,
                    date: updatedClass.date
                      ? parse(updatedClass.date, 'yyyy-MM-dd', new Date())
                      : prev.date,
                    startTime: updatedClass.start_time ? updatedClass.start_time.substring(0, 5) : prev.startTime,
                    endTime: updatedClass.end_time ? updatedClass.end_time.substring(0, 5) : prev.endTime,
                    subject: updatedClass.subject || prev.subject,
                    zoomLink: updatedClass.zoom_link || '',
                    notes: updatedClass.notes || '',
                    status: updatedClass.status || prev.status,
                    attendance: updatedClass.attendance || prev.attendance,
                    relationshipId: updatedClass.relationship_id || prev.relationshipId,
                  };
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedClass = payload.old;
              if (!deletedClass || !deletedClass.id) return;
              
              toast.info(`Class "${deletedClass.title || 'Unnamed'}" has been cancelled`);
              
              setScheduledClasses((prev) =>
                prev.filter((cls) => cls.id !== deletedClass.id)
              );
              
              // If this is the event we're currently viewing, close the dialog
              if (selectedEvent && selectedEvent.id === deletedClass.id) {
                setSelectedEvent(null);
                setIsViewEventOpen(false);
              }
            }
          } catch (error) {
            console.error('Error processing scheduled classes realtime update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Consolidated tutor subscription status:`, status);
      });
      
    // Clean up the subscription
    return () => {
      console.log(`Removing consolidated channel for tutor ${user.id}`);
      supabase.removeChannel(channel);
    };
  }, [
    user?.id,
    setScheduledClasses,
    selectedEvent,
    setSelectedEvent,
    setIsViewEventOpen,
    queryClient,
  ]);
}

export default useSchedulerRealtime;