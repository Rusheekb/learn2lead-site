
import { useEffect } from "react";
import { toast } from "sonner";
import { ClassEvent } from "@/types/tutorTypes";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeSubscription, dbIdToNumeric } from "@/utils/realtimeUtils";

export const useSchedulerRealtime = (
  scheduledClasses: ClassEvent[], 
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>,
  selectedEvent: ClassEvent | null,
  setSelectedEvent: React.Dispatch<React.SetStateAction<ClassEvent | null>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Subscribe to real-time updates
  useEffect(() => {
    const channel = createRealtimeSubscription({
      channelName: 'tutor-class-updates',
      tableName: 'class_logs',
      onInsert: (newClass) => handleClassInserted(newClass),
      onUpdate: (updatedClass) => handleClassUpdated(updatedClass),
      onDelete: (deletedClass) => handleClassDeleted(deletedClass)
    });
    
    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [scheduledClasses]); // Depend on scheduledClasses to ensure we have the latest reference when handling events

  const handleClassInserted = (newClass: any) => {
    const classEvent: ClassEvent = {
      id: dbIdToNumeric(newClass.id),
      title: newClass.title,
      date: new Date(newClass.date),
      startTime: newClass.start_time.substring(0, 5),
      endTime: newClass.end_time.substring(0, 5),
      studentId: dbIdToNumeric(newClass.id), // Placeholder 
      studentName: newClass.student_name,
      subject: newClass.subject,
      zoomLink: newClass.zoom_link || "",
      notes: newClass.notes || "",
      recurring: false, // Default to false
      materials: [] 
    };

    setScheduledClasses(prevClasses => [...prevClasses, classEvent]);
    toast.success(`New class scheduled: ${classEvent.title}`);
  };

  const handleClassUpdated = (updatedClass: any) => {
    const classEvent: ClassEvent = {
      id: dbIdToNumeric(updatedClass.id),
      title: updatedClass.title,
      date: new Date(updatedClass.date),
      startTime: updatedClass.start_time.substring(0, 5),
      endTime: updatedClass.end_time.substring(0, 5),
      studentId: dbIdToNumeric(updatedClass.id), // Placeholder
      studentName: updatedClass.student_name,
      subject: updatedClass.subject,
      zoomLink: updatedClass.zoom_link || "",
      notes: updatedClass.notes || "",
      recurring: false, // Default to false
      materials: []
    };

    setScheduledClasses(prevClasses => 
      prevClasses.map(cls => 
        cls.id === classEvent.id ? classEvent : cls
      )
    );

    // If this is the currently selected event, update it
    if (selectedEvent && selectedEvent.id === classEvent.id) {
      setSelectedEvent(classEvent);
    }

    toast.info(`Class updated: ${classEvent.title}`);
  };

  const handleClassDeleted = (deletedClass: any) => {
    const classId = dbIdToNumeric(deletedClass.id);
    
    setScheduledClasses(prevClasses => 
      prevClasses.filter(cls => cls.id !== classId)
    );

    // If this is the currently selected event, close the details dialog
    if (selectedEvent && selectedEvent.id === classId) {
      setIsViewEventOpen(false);
      setSelectedEvent(null);
    }

    toast.info(`Class removed: ${deletedClass.title}`);
  };

  return {
    handleClassInserted,
    handleClassUpdated,
    handleClassDeleted
  };
};

export default useSchedulerRealtime;
