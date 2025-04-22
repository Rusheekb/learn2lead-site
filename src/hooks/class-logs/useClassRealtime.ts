import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeSubscription } from "@/utils/realtimeSubscription";
import { dbIdToNumeric } from "@/utils/realtimeUtils";

// Define types for database record
interface ClassLogRecord {
  id: string;
  title: string;
  subject: string;
  tutor_name: string;
  student_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  attendance: string;
  zoom_link: string | null;
  notes: string | null;
}

export const useClassRealtime = (
  classes: any[],
  setClasses: React.Dispatch<React.SetStateAction<any[]>>,
  selectedClass: any | null,
  setSelectedClass: React.Dispatch<React.SetStateAction<any | null>>,
  setIsDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  useEffect(() => {
    const channel = createRealtimeSubscription({
      channelName: 'class-logs-changes',
      tableName: 'class_logs',
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          handleClassInserted(payload.new);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          handleClassUpdated(payload.new);
        } else if (payload.eventType === 'DELETE' && payload.old) {
          handleClassDeleted(payload.old);
        }
      }
    });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classes, handleClassInserted, handleClassUpdated, handleClassDeleted]); // Added handler dependencies

  const handleClassInserted = (newClass: ClassLogRecord) => {
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

  const handleClassUpdated = (updatedClass: ClassLogRecord) => {
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

    if (selectedClass && selectedClass.id === transformedClass.id) {
      setSelectedClass(transformedClass);
    }

    toast.info(`Class updated: ${transformedClass.title}`);
  };

  const handleClassDeleted = (deletedClass: ClassLogRecord) => {
    const classId = dbIdToNumeric(deletedClass.id);
    
    setClasses(prevClasses => 
      prevClasses.filter(cls => cls.id !== classId)
    );

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
