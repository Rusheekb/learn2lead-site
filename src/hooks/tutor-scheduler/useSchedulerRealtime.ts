import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';

export const useSchedulerRealtime = (
  scheduledClasses: ClassEvent[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>,
  selectedEvent: ClassEvent | null,
  setSelectedEvent: React.Dispatch<React.SetStateAction<ClassEvent | null>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const handleClassInserted = useCallback(
    (newClass: any) => {
      if (scheduledClasses.some((cls) => cls.id === newClass.id)) {
        return;
      }

      const classEvent: ClassEvent = {
        id: newClass.id,
        title: newClass.title,
        date: new Date(newClass.date),
        startTime: newClass.start_time?.substring(0, 5) || '00:00',
        endTime: newClass.end_time?.substring(0, 5) || '00:00',
        studentId: newClass.student_id,
        studentName: newClass.student_name || 'Student',
        subject: newClass.subject || '',
        zoomLink: newClass.zoom_link || '',
        notes: newClass.notes || '',
        tutorId: newClass.tutor_id,
        tutorName: newClass.tutor_name || 'Tutor',
      };

      setScheduledClasses((prevClasses) => [...prevClasses, classEvent]);
    },
    [scheduledClasses, setScheduledClasses]
  );

  const handleClassUpdated = useCallback(
    (updatedClass: any) => {
      const classEvent: ClassEvent = {
        id: updatedClass.id,
        title: updatedClass.title,
        date: new Date(updatedClass.date),
        startTime: updatedClass.start_time?.substring(0, 5) || '00:00',
        endTime: updatedClass.end_time?.substring(0, 5) || '00:00',
        studentId: updatedClass.student_id,
        studentName: updatedClass.student_name || 'Student',
        subject: updatedClass.subject || '',
        zoomLink: updatedClass.zoom_link || '',
        notes: updatedClass.notes || '',
        tutorId: updatedClass.tutor_id,
        tutorName: updatedClass.tutor_name || 'Tutor',
      };

      setScheduledClasses((prevClasses) =>
        prevClasses.map((cls) => (cls.id === classEvent.id ? classEvent : cls))
      );

      if (selectedEvent && selectedEvent.id === classEvent.id) {
        setSelectedEvent(classEvent);
      }
    },
    [setScheduledClasses, selectedEvent, setSelectedEvent]
  );

  const handleClassDeleted = useCallback(
    (deletedClass: any) => {
      const classId = deletedClass.id;

      setScheduledClasses((prevClasses) =>
        prevClasses.filter((cls) => cls.id !== classId)
      );

      if (selectedEvent && selectedEvent.id === classId) {
        setIsViewEventOpen(false);
        setSelectedEvent(null);
      }
    },
    [setScheduledClasses, selectedEvent, setSelectedEvent, setIsViewEventOpen]
  );

  useEffect(() => {
    const channel = supabase
      .channel('tutor-classes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_classes',
        },
        (payload) => {
          handleClassInserted(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_classes',
        },
        (payload) => {
          handleClassUpdated(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'student_classes',
        },
        (payload) => {
          handleClassDeleted(payload.old);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    scheduledClasses,
    handleClassInserted,
    handleClassUpdated,
    handleClassDeleted,
  ]);

  return {
    handleClassInserted,
    handleClassUpdated,
    handleClassDeleted,
  };
};

export default useSchedulerRealtime;
