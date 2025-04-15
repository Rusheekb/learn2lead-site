import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchClassLogs } from "@/services/classLogsService";
import { ClassEvent } from "@/types/tutorTypes";
import { supabase } from "@/integrations/supabase/client";

export const useClassData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Format time utility function
  const formatTime = (timeString: string) => {
    try {
      if (!timeString) return 'N/A';
      
      // Handle different time formats
      const cleanTime = timeString.trim().toLowerCase();
      
      // If time is already in 12-hour format with AM/PM
      if (cleanTime.includes('am') || cleanTime.includes('pm')) {
        return cleanTime.toUpperCase();
      }

      const [hourStr, minuteStr = '00'] = cleanTime.split(':');
      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);

      // Validate hour and minute
      if (isNaN(hour) || hour < 0 || hour > 23) return 'Invalid Time';
      if (isNaN(minute) || minute < 0 || minute > 59) return 'Invalid Time';
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      
      return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      console.warn('Error formatting time:', timeString, error);
      return 'Invalid Time';
    }
  };

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
