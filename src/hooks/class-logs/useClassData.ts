import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchClassLogs } from "@/services/classLogsService";
import { ClassEvent } from "@/types/tutorTypes";

export const useClassData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassEvent[]>([]);

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

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoading(true);
    try {
      const classLogs = await fetchClassLogs();
      // Ensure dates are properly converted to Date objects
      const processedLogs = classLogs.map(log => ({
        ...log,
        date: log.date instanceof Date ? log.date : new Date(log.date)
      }));
      setClasses(processedLogs);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load class logs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      await loadClasses();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique subjects for filter
  const allSubjects = Array.from(new Set(classes.map(cls => cls.subject))).sort();

  return {
    isLoading,
    classes,
    setClasses,
    allSubjects,
    formatTime,
    loadClasses,
    handleRefreshData
  };
};

export default useClassData;
