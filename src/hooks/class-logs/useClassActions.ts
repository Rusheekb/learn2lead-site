
import { useState } from "react";
import { toast } from "sonner";
import { 
  fetchClassMessages, 
  markMessageAsRead 
} from "@/services/classMessagesService";
import { fetchClassUploads, getFileDownloadURL } from "@/services/classUploadsService";
import { numericIdToDbId } from "@/utils/realtimeUtils";

export const useClassActions = () => {
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [studentUploads, setStudentUploads] = useState<any[]>([]);
  const [studentMessages, setStudentMessages] = useState<any[]>([]);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>("details");
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleClassClick = (cls: any) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
  };

  const loadClassContent = async (classId: number) => {
    if (!classId) return;
    
    try {
      // Convert numeric ID to UUID-like string for database query
      const dbClassId = numericIdToDbId(classId);
      
      // Load messages
      const messages = await fetchClassMessages(dbClassId);
      setStudentMessages(messages);
      
      // Load uploads
      const uploads = await fetchClassUploads(dbClassId);
      setStudentUploads(uploads);
    } catch (error) {
      console.error("Error loading class content:", error);
    }
  };

  const handleMarkMessageRead = async (messageId: number) => {
    try {
      // Convert numeric ID to UUID-like string for database query
      const dbMessageId = numericIdToDbId(messageId);
      
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

  const getUnreadMessageCount = (classId: number) => {
    return studentMessages.filter(m => m.classId === classId && !m.isRead).length;
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  return {
    // State
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
    
    // Methods
    handleClassClick,
    loadClassContent,
    handleMarkMessageRead,
    handleDownloadFile,
    handleExport,
    getUnreadMessageCount,
    handlePageChange,
    handlePageSizeChange,
  };
};

export default useClassActions;
