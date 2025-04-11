
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createRealtimeSubscription, dbIdToNumeric } from "@/utils/realtimeUtils";
import { supabase } from "@/integrations/supabase/client";

export const useClassRealtime = (classes: any[], setClasses: React.Dispatch<React.SetStateAction<any[]>>, selectedClass: any | null, setSelectedClass: React.Dispatch<React.SetStateAction<any | null>>, setIsDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>) => {
  // Subscribe to real-time updates
  useEffect(() => {
    const channel = createRealtimeSubscription({
      channelName: 'class-logs-changes',
      tableName: 'class_logs',
      onInsert: (newClass) => handleClassInserted(newClass),
      onUpdate: (updatedClass) => handleClassUpdated(updatedClass),
      onDelete: (deletedClass) => handleClassDeleted(deletedClass)
    });
    
    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classes]); // Depend on classes to ensure we have the latest reference when handling events

  const handleClassInserted = (newClass: any) => {
    // Transform to the format expected by the component
    const transformedClass = {
      id: dbIdToNumeric(newClass.id),
      title: newClass.title,
      subject: newClass.subject,
      tutorName: newClass.tutor_name,
      studentName: newClass.student_name,
      date: newClass.date,
      startTime: newClass.start_time.substring(0, 5),
      endTime: newClass.end_time.substring(0, 5),
      status: newClass.status,
      attendance: newClass.attendance,
      zoomLink: newClass.zoom_link,
      notes: newClass.notes
    };

    setClasses(prevClasses => [...prevClasses, transformedClass]);
    toast.success(`New class added: ${transformedClass.title}`);
  };

  const handleClassUpdated = (updatedClass: any) => {
    // Transform to the format expected by the component
    const transformedClass = {
      id: dbIdToNumeric(updatedClass.id),
      title: updatedClass.title,
      subject: updatedClass.subject,
      tutorName: updatedClass.tutor_name,
      studentName: updatedClass.student_name,
      date: updatedClass.date,
      startTime: updatedClass.start_time.substring(0, 5),
      endTime: updatedClass.end_time.substring(0, 5),
      status: updatedClass.status,
      attendance: updatedClass.attendance,
      zoomLink: updatedClass.zoom_link,
      notes: updatedClass.notes
    };

    setClasses(prevClasses => 
      prevClasses.map(cls => 
        cls.id === transformedClass.id ? transformedClass : cls
      )
    );

    // If this is the currently selected class, update it
    if (selectedClass && selectedClass.id === transformedClass.id) {
      setSelectedClass(transformedClass);
    }

    toast.info(`Class updated: ${transformedClass.title}`);
  };

  const handleClassDeleted = (deletedClass: any) => {
    const classId = dbIdToNumeric(deletedClass.id);
    
    setClasses(prevClasses => 
      prevClasses.filter(cls => cls.id !== classId)
    );

    // If this is the currently selected class, close the details dialog
    if (selectedClass && selectedClass.id === classId) {
      setIsDetailsOpen(false);
      setSelectedClass(null);
    }

    toast.info(`Class removed: ${deletedClass.title}`);
  };

  return {
    handleClassInserted,
    handleClassUpdated,
    handleClassDeleted
  };
};

export default useClassRealtime;
