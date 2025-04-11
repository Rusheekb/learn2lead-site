import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchClassLogs, fetchClassMessages, fetchClassUploads, markMessageAsRead, getFileDownloadURL } from "@/services/classService";
import { supabase } from "@/integrations/supabase/client";

export const useClassLogs = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [studentUploads, setStudentUploads] = useState<any[]>([]);
  const [studentMessages, setStudentMessages] = useState<any[]>([]);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>("details");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);

  // Fetch classes on component mount
  useEffect(() => {
    loadClasses();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('class-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'class_logs'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            handleClassInserted(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            handleClassUpdated(payload.new);
          } else if (payload.eventType === 'DELETE') {
            handleClassDeleted(payload.old);
          }
        }
      )
      .subscribe();
    
    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classes]); // Depend on classes to ensure we have the latest reference when handling events

  // Load messages and uploads when a class is selected
  useEffect(() => {
    const loadClassContent = async () => {
      if (!selectedClass) return;
      
      try {
        // Convert numeric ID back to UUID-like string for database query
        const classId = selectedClass.id.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
        
        // Load messages
        const messages = await fetchClassMessages(classId);
        setStudentMessages(messages);
        
        // Load uploads
        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error) {
        console.error("Error loading class content:", error);
      }
    };
    
    loadClassContent();
  }, [selectedClass]);

  // Handle a newly inserted class
  const handleClassInserted = (newClass: any) => {
    // Transform to the format expected by the component
    const transformedClass = {
      id: parseInt(newClass.id.substring(0, 8), 16),
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

  // Handle an updated class
  const handleClassUpdated = (updatedClass: any) => {
    // Transform to the format expected by the component
    const transformedClass = {
      id: parseInt(updatedClass.id.substring(0, 8), 16),
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

  // Handle a deleted class
  const handleClassDeleted = (deletedClass: any) => {
    const classId = parseInt(deletedClass.id.substring(0, 8), 16);
    
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

  const handleClassClick = (cls: any) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
  };

  const formatTime = (timeString: string) => {
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSubjectFilter("all");
    setDateFilter(undefined);
  };

  const handleMarkMessageRead = async (messageId: number) => {
    try {
      // Convert numeric ID back to UUID-like string for database query
      const dbMessageId = messageId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      const success = await markMessageAsRead(dbMessageId);
      
      if (success) {
        setStudentMessages(messages => 
          messages.map(message => 
            message.id === messageId ? { ...message, isRead: true } : message
          )
        );
        toast.success("Message marked as read");
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };

  const getUnreadMessageCount = (classId: number) => {
    return studentMessages.filter(m => m.classId === classId && !m.isRead).length;
  };

  const handleDownloadFile = async (uploadId: number) => {
    try {
      const upload = studentUploads.find(u => u.id === uploadId);
      if (upload) {
        // In a real implementation, we would get the file path and create a download URL
        toast.success(`Downloading ${upload.fileName}`);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const fileName = `class-logs-${format === 'csv' ? 'spreadsheet.csv' : 'report.pdf'}`;
      toast.success(`Exported ${fileName} successfully`);
    } catch (error) {
      toast.error('Failed to export file');
    } finally {
      setIsExporting(false);
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

  const filteredClasses = classes.filter((cls) => {
    const searchMatch = searchTerm === "" || 
      cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusMatch = statusFilter === "all" || cls.status === statusFilter;
    
    const subjectMatch = subjectFilter === "all" || cls.subject.toLowerCase() === subjectFilter.toLowerCase();
    
    const dateMatch = !dateFilter || new Date(cls.date).toDateString() === dateFilter.toDateString();
    
    return searchMatch && statusMatch && subjectMatch && dateMatch;
  });

  // Extract unique subjects for filter
  const allSubjects = Array.from(new Set(classes.map(cls => cls.subject))).sort();

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    subjectFilter,
    setSubjectFilter,
    dateFilter,
    setDateFilter,
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab,
    setActiveDetailsTab,
    isExporting,
    isLoading,
    classes,
    filteredClasses,
    allSubjects,
    handleClassClick,
    formatTime,
    clearFilters,
    handleMarkMessageRead,
    getUnreadMessageCount,
    handleDownloadFile,
    handleExport,
    handleRefreshData
  };
};

export default useClassLogs;
