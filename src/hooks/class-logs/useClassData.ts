
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchClassLogs } from "@/services/classService";

export const useClassData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);

  // Format time utility function
  const formatTime = (timeString: string) => {
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoading(true);
    try {
      const classLogs = await fetchClassLogs();
      
      // Transform to the format expected by the component
      const transformedClasses = classLogs.map(cl => ({
        id: cl.id,
        title: cl.title,
        subject: cl.subject,
        tutorName: "Ms. Johnson", // This would come from the database in a real app
        studentName: cl.studentName,
        date: cl.date.toISOString().split('T')[0],
        startTime: cl.startTime,
        endTime: cl.endTime,
        status: "upcoming", // This would come from the database in a real app
        attendance: "pending", // This would come from the database in a real app
        zoomLink: cl.zoomLink,
        notes: cl.notes
      }));
      
      setClasses(transformedClasses);
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
