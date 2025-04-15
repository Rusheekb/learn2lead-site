
import { useState, useCallback } from "react";
import { ClassEvent } from "@/types/tutorTypes";
import { StudentMessage, StudentUpload } from "@/components/shared/StudentContent";
import { fetchClassMessages, fetchClassUploads, markMessageAsRead } from "@/services/classService";
import { toast } from "sonner";
import { exportClassLogs } from "@/services/exportService";
import { ExportFormat } from "@/types/classTypes";

export const useClassActions = () => {
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<ClassEvent | null>(null);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>("details");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  const loadClassContent = useCallback(async (classId: string) => {
    try {
      // Fetch messages for this class
      const messages = await fetchClassMessages(classId);
      setStudentMessages(messages);

      // Fetch uploads for this class
      const uploads = await fetchClassUploads(classId);
      setStudentUploads(uploads);
    } catch (error) {
      console.error("Error loading class content:", error);
      toast.error("Failed to load class content");
    }
  }, []);

  const handleClassClick = useCallback((cls: ClassEvent) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
    setActiveDetailsTab("details");
  }, []);

  const handleMarkMessageRead = useCallback(async (messageId: string): Promise<void> => {
    try {
      const success = await markMessageAsRead(messageId);
      
      if (success) {
        // Update local state
        setStudentMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId ? { ...msg, isRead: true } : msg
          )
        );
        toast.success("Message marked as read");
      } else {
        toast.error("Failed to mark message as read");
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  }, []);
  
  const handleDownloadFile = useCallback(async (uploadId: string): Promise<void> => {
    try {
      // In a real implementation, we would actually download the file here
      const upload = studentUploads.find(u => u.id === uploadId);
      
      if (upload) {
        toast.success(`Downloading ${upload.fileName}`);
      } else {
        toast.error("File not found");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  }, [studentUploads]);

  const getUnreadMessageCount = useCallback((classId: string): number => {
    return studentMessages.filter(msg => msg.classId === classId && !msg.isRead).length;
  }, [studentMessages]);
  
  const handleExport = useCallback(async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      const classes = selectedClass ? [selectedClass] : []; // Use real class data in a real app
      const success = await exportClassLogs(classes, format);
      
      if (success) {
        toast.success(`Export as ${format.toUpperCase()} completed successfully`);
      } else {
        toast.error(`Failed to export as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  }, [selectedClass]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when page size changes
  }, []);

  return {
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    setSelectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab,
    setActiveDetailsTab,
    isExporting,
    page,
    setPage,
    pageSize,
    setPageSize,
    handleClassClick,
    loadClassContent,
    handleMarkMessageRead,
    handleDownloadFile,
    handleExport,
    getUnreadMessageCount,
    handlePageChange,
    handlePageSizeChange
  };
};

export default useClassActions;
