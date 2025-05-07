
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { fetchClassLogs } from '@/services/classLogsService';
import { TransformedClassLog } from '@/services/logs/types';

export const useClassData = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const classLogs = await fetchClassLogs();
      
      // Convert TransformedClassLog to ClassEvent
      const convertedLogs: ClassEvent[] = classLogs.map((log: TransformedClassLog): ClassEvent => ({
        id: log.id,
        title: log.title || log.classNumber || '',
        tutorName: log.tutorName,
        studentName: log.studentName,
        date: log.date,
        startTime: log.startTime,
        endTime: log.endTime,
        subject: log.subject,
        content: log.content,
        homework: log.homework,
        duration: log.duration,
        classCost: log.classCost,
        tutorCost: log.tutorCost,
        studentPayment: log.studentPayment as any, // Type casting
        tutorPayment: log.tutorPayment as any, // Type casting
        notes: log.notes || log.additionalInfo || null,
        status: log.additionalInfo?.includes('Status:') 
          ? log.additionalInfo.split('Status:')[1].trim().split(' ')[0] as any
          : 'pending',
        attendance: log.additionalInfo?.includes('Attendance:')
          ? log.additionalInfo.split('Attendance:')[1].trim().split(' ')[0] as any
          : 'pending',
        zoomLink: log.zoomLink || null,
        recurring: false,
        materials: [],
      }));
      
      setClasses(convertedLogs);
    } catch (error: any) {
      console.error('Error loading classes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load class logs');
      toast.error('Failed to load class logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleRefreshData = async () => {
    await loadClasses();
  };

  return {
    isLoading,
    error,
    classes,
    setClasses,
    handleRefreshData,
  };
};
