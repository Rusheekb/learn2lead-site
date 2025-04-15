
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchClassLogs } from "@/services/classLogsService";
import { ClassEvent } from "@/types/tutorTypes";
import { supabase } from "@/integrations/supabase/client";
import { formatTime } from "@/utils/timeUtils";

export const useClassData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Test Supabase connection
  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('class_logs').select('count');
      if (error) {
        console.error('Supabase connection test failed:', error);
        setError('Database connection failed');
        return false;
      }
      console.log('Supabase connection test successful:', data);
      return true;
    } catch (error) {
      console.error('Supabase connection test error:', error);
      setError('Database connection error');
      return false;
    }
  };

  // Load classes on mount
  useEffect(() => {
    const init = async () => {
      const isConnected = await testConnection();
      if (isConnected) {
        loadClasses();
      }
    };
    init();
  }, []);

  const loadClasses = async () => {
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

      // Ensure dates are properly converted to Date objects
      const processedLogs = classLogs.map(log => {
        console.log('Processing log:', log);
        return {
          ...log,
          date: log.date instanceof Date ? log.date : new Date(log.date)
        };
      });
      
      console.log('Processed logs:', processedLogs);
      setClasses(processedLogs);
    } catch (error) {
      console.error("Error loading classes:", error);
      setError(error instanceof Error ? error.message : 'Failed to load class logs');
      toast.error("Failed to load class logs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadClasses();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError(error instanceof Error ? error.message : 'Failed to refresh data');
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique subjects for filter
  const allSubjects = Array.from(new Set(classes.map(cls => cls.subject))).sort();

  return {
    isLoading,
    error,
    classes,
    setClasses,
    allSubjects,
    formatTime,
    loadClasses,
    handleRefreshData
  };
};

export default useClassData;
