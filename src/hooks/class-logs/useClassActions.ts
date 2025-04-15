
import { useState } from "react";
import { toast } from "sonner";
import { ClassEvent } from "@/types/tutorTypes";
import { fetchClassMessages, markMessageAsRead } from "@/services/classMessagesService";
import { fetchClassUploads } from "@/services/classUploadsService";
import { StudentMessage, StudentUpload } from "@/components/shared/StudentContent";
import { ExportFormat } from "@/types/classTypes";
import { exportToCsv, exportToPdf } from "@/services/exportService";

export const useClassActions = () => {
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<ClassEvent | null>(null);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>("details");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Load student uploads and messages for a class
  const loadClassContent = async (classId: string) => {
    try {
      const uploads = await fetchClassUploads(classId);
      setStudentUploads(uploads);
      console.log('Fetched uploads:', uploads);
      
      const messages = await fetchClassMessages(classId);
      setStudentMessages(messages);
      console.log('Fetched messages:', messages);
      
    } catch (error) {
      console.error("Error loading class content:", error);
    }
  };

  // Handle click on a class row
  const handleClassClick = (cls: ClassEvent) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
    loadClassContent(cls.id);
  };

  // Mark message as read
  const handleMarkMessageRead = async (messageId: string) => {
    try {
      const success = await markMessageAsRead(messageId);
      if (success) {
        setStudentMessages(studentMessages.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        ));
        console.log('Marked message as read:', messageId);
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  // Handle downloading a file
  const handleDownloadFile = (uploadId: string) => {
    // This is just a stub - in a real app, this would trigger a file download
    const upload = studentUploads.find(u => u.id === uploadId);
    if (!upload) {
      toast.error("File not found");
      return;
    }
    
    toast.success(`Downloading ${upload.fileName}...`);
    console.log("Download file:", upload);
  };

  // Handle exporting classes
  const handleExport = async (format: ExportFormat) => {
    if (!selectedClass) return;
    
    setIsExporting(true);
    try {
      const exportFn = format === 'csv' ? exportToCsv : exportToPdf;
      await exportFn([selectedClass], format);
      toast.success(`Class exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to export as ${format.toUpperCase()}`);
      console.error(`Error exporting as ${format}:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  // Get unread message count for a class
  const getUnreadMessageCount = (classId: string): number => {
    return studentMessages.filter(msg => 
      msg.classId === classId && !msg.isRead
    ).length;
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

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
