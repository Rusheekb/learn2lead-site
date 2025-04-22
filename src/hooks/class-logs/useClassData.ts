import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fetchClassLogs } from '@/services/classLogsService';
import { ClassEvent } from '@/types/tutorTypes';
import { supabase } from '@/integrations/supabase/client';
import { formatTime } from '@/utils/timeUtils';

export const useClassData = (): {
  isLoading: boolean;
  error: string | null;
  classes: ClassEvent[];
  setClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>;
  allSubjects: string[];
  formatTime: (time: string) => string;
  handleRefreshData: () => Promise<void>;
} => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get unique subjects from classes
  const allSubjects = Array.from(
    new Set(classes.map((cls) => cls.subject || ''))
  );

  const testConnection = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('class_logs').select('count');
      if (error) {
        console.error('Supabase connection test failed:', error);
        setError('Database connection failed');
        return false;
      }
      console.log('Supabase connection test successful:', data);
      return true;
    } catch (error: any) {
      console.error('Supabase connection test error:', error);
      setError('Database connection error');
      return false;
    }
  };

  const loadClasses = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Starting to load classes...');
      const classLogs = await fetchClassLogs();
      console.log('Fetched class logs:', classLogs);

      if (!Array.isArray(classLogs)) {
        console.error('Class logs is not an array:', classLogs);
        setError('Invalid data format received');
        return;
      }

      const processedLogs = classLogs.map((log: ClassEvent) => ({
        ...log,
        date: log.date instanceof Date ? log.date : new Date(log.date),
      }));

      console.log('Processed logs:', processedLogs);
      setClasses(processedLogs);
    } catch (error: any) {
      console.error('Error loading classes:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load class logs'
      );
      toast.error('Failed to load class logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Load classes on mount
  useEffect(() => {
    const init = async (): Promise<void> => {
      const isConnected = await testConnection();
      if (isConnected) {
        await loadClasses();
      }
    };
    init();
  }, []);

  const handleRefreshData = async (): Promise<void> => {
    await loadClasses();
  };

  return {
    isLoading,
    error,
    classes,
    setClasses,
    allSubjects,
    formatTime,
    handleRefreshData,
  };
};

export default useClassData;
