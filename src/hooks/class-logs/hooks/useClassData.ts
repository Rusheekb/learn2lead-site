
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { fetchClassLogs } from '@/services/classLogsService';

export const useClassData = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const classLogs = await fetchClassLogs();
      setClasses(classLogs);
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
