import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createRealtimeSubscription } from '@/utils/realtimeSubscription';
import { dbIdToNumeric } from '@/utils/realtimeUtils';
import { DbClassLog } from '@/services/logs/types';

// Alias DbClassLog as ClassLogRecord for compatibility with existing code
type ClassLogRecord = DbClassLog;

export const useClassRealtime = (
  classes: any[],
  setClasses: React.Dispatch<React.SetStateAction<any[]>>,
  selectedClass: any | null,
  setSelectedClass: React.Dispatch<React.SetStateAction<any | null>>,
  setIsDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const handleClassInserted = useCallback(
    (newClass: ClassLogRecord) => {
      const transformedClass = {
        id: dbIdToNumeric(newClass.id),
        title: newClass['Class Number'] || '',
        subject: newClass['Subject'] || '',
        tutorName: newClass['Tutor Name'] || '',
        studentName: newClass['Student Name'] || '',
        date: newClass['Date'] || '',
        startTime: newClass['Time (CST)']
          ? newClass['Time (CST)'].substring(0, 5)
          : '',
        endTime: newClass['Time (CST)']
          ? newClass['Time (CST)'].substring(0, 5)
          : '', // Using same time for now
        status: 'completed', // Default status since it's not in the DB
        attendance: 'present', // Default attendance since it's not in the DB
        zoomLink: '', // Default empty since it's not in the DB
        notes: newClass['Additional Info'] || '',
      };

      setClasses((prevClasses) => [...prevClasses, transformedClass]);
    },
    [setClasses]
  );

  const handleClassUpdated = useCallback(
    (updatedClass: ClassLogRecord) => {
      const transformedClass = {
        id: dbIdToNumeric(updatedClass.id),
        title: updatedClass['Class Number'] || '',
        subject: updatedClass['Subject'] || '',
        tutorName: updatedClass['Tutor Name'] || '',
        studentName: updatedClass['Student Name'] || '',
        date: updatedClass['Date'] || '',
        startTime: updatedClass['Time (CST)']
          ? updatedClass['Time (CST)'].substring(0, 5)
          : '',
        endTime: updatedClass['Time (CST)']
          ? updatedClass['Time (CST)'].substring(0, 5)
          : '', // Using same time for now
        status: 'completed', // Default status since it's not in the DB
        attendance: 'present', // Default attendance since it's not in the DB
        zoomLink: '', // Default empty since it's not in the DB
        notes: updatedClass['Additional Info'] || '',
      };

      setClasses((prevClasses) =>
        prevClasses.map((cls) =>
          cls.id === transformedClass.id ? transformedClass : cls
        )
      );

      if (selectedClass && selectedClass.id === transformedClass.id) {
        setSelectedClass(transformedClass);
      }
    },
    [setClasses, selectedClass, setSelectedClass]
  );

  const handleClassDeleted = useCallback(
    (deletedClass: ClassLogRecord) => {
      const classId = dbIdToNumeric(deletedClass.id);

      setClasses((prevClasses) =>
        prevClasses.filter((cls) => cls.id !== classId)
      );

      if (selectedClass && selectedClass.id === classId) {
        setIsDetailsOpen(false);
        setSelectedClass(null);
      }
    },
    [setClasses, selectedClass, setSelectedClass, setIsDetailsOpen]
  );

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
      },
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleClassInserted, handleClassUpdated, handleClassDeleted]);

  return {
    handleClassInserted,
    handleClassUpdated,
    handleClassDeleted,
  };
};

export default useClassRealtime;
