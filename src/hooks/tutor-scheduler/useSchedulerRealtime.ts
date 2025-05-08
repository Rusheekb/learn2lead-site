
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { useAuth } from '@/contexts/AuthContext';

function useSchedulerRealtime(
  scheduledClasses: ClassEvent[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>,
  selectedEvent: ClassEvent | null,
  setSelectedEvent: React.Dispatch<React.SetStateAction<ClassEvent | null>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('Setting up realtime subscription for tutor:', user.id);
    
    // Create channel with a filter for the current tutor's classes only
    const channel = supabase
      .channel(`tutor-classes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_classes',
          filter: `tutor_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime update for tutor classes:', payload);
          
          try {
            if (payload.eventType === 'INSERT') {
              const newClass = payload.new;
              if (!newClass) return;
              
              // Convert database record to ClassEvent
              const newClassEvent: ClassEvent = {
                id: newClass.id || '',
                title: newClass.title || '',
                tutorName: newClass.tutor_name || '',
                studentName: newClass.student_name || '',
                date: newClass.date ? new Date(newClass.date) : new Date(),
                startTime: newClass.start_time ? newClass.start_time.substring(0, 5) : '',
                endTime: newClass.end_time ? newClass.end_time.substring(0, 5) : '',
                subject: newClass.subject || '',
                zoomLink: newClass.zoom_link,
                notes: newClass.notes,
                status: newClass.status || 'scheduled',
                attendance: newClass.attendance || 'pending',
                studentId: newClass.student_id || '',
                tutorId: newClass.tutor_id || '',
              };
              
              setScheduledClasses((prev) => [...prev, newClassEvent]);
              
              // If this is the event we're currently viewing, update it
              if (selectedEvent && selectedEvent.id === newClass.id) {
                setSelectedEvent(newClassEvent);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedClass = payload.new;
              if (!updatedClass || !updatedClass.id) return;
              
              setScheduledClasses((prev) =>
                prev.map((cls) => {
                  if (cls.id === updatedClass.id) {
                    // Convert database record to ClassEvent
                    return {
                      ...cls,
                      title: updatedClass.title || cls.title,
                      date: updatedClass.date ? new Date(updatedClass.date) : cls.date,
                      startTime: updatedClass.start_time ? updatedClass.start_time.substring(0, 5) : cls.startTime,
                      endTime: updatedClass.end_time ? updatedClass.end_time.substring(0, 5) : cls.endTime,
                      subject: updatedClass.subject || cls.subject,
                      zoomLink: updatedClass.zoom_link,
                      notes: updatedClass.notes,
                      status: updatedClass.status || cls.status,
                      attendance: updatedClass.attendance || cls.attendance,
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
                    date: updatedClass.date ? new Date(updatedClass.date) : prev.date,
                    startTime: updatedClass.start_time ? updatedClass.start_time.substring(0, 5) : prev.startTime,
                    endTime: updatedClass.end_time ? updatedClass.end_time.substring(0, 5) : prev.endTime,
                    subject: updatedClass.subject || prev.subject,
                    zoomLink: updatedClass.zoom_link,
                    notes: updatedClass.notes,
                    status: updatedClass.status || prev.status,
                    attendance: updatedClass.attendance || prev.attendance,
                  };
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedClass = payload.old;
              if (!deletedClass || !deletedClass.id) return;
              
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
            console.error('Error processing realtime update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Tutor subscription status:`, status);
      });
      
    // Clean up the subscription
    return () => {
      console.log(`Removing channel for tutor ${user.id}`);
      supabase.removeChannel(channel);
    };
  }, [
    scheduledClasses,
    setScheduledClasses,
    selectedEvent,
    setSelectedEvent,
    setIsViewEventOpen,
    user?.id,
  ]);
}

export default useSchedulerRealtime;
