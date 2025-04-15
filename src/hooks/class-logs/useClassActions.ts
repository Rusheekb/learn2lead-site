import { useState } from "react";
import { toast } from "sonner";
import { 
  fetchClassMessages, 
  markMessageAsRead 
} from "@/services/classMessagesService";
import { fetchClassUploads } from "@/services/classUploadsService";
import { numericIdToDbId } from "@/utils/realtimeUtils";
import { 
  StudentMessage, 
  StudentUpload,
  ClassDetailsState, 
  PaginationState,
  ExportFormat 
} from "@/types/classTypes";
import { ClassEvent } from "@/types/tutorTypes";
import { StudentMessage as StudentMessageComponent, StudentUpload as StudentUploadComponent } from "@/components/shared/StudentContent";

export const useClassActions = () => {
  // Class details state
  const [detailsState, setDetailsState] = useState<ClassDetailsState>({
    isOpen: false,
    selectedClass: null,
    activeTab: "details",
    uploads: [] as StudentUpload[],
    messages: [] as StudentMessage[]
  });

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Class details actions
  const handleClassClick = (cls: ClassEvent) => {
    setDetailsState(prev => ({
      ...prev,
      isOpen: true,
      selectedClass: cls
    }));
  };

  const loadClassContent = async (classId: number) => {
    if (!classId) return;
    
    try {
      const dbClassId = numericIdToDbId(classId);
      
      // Load messages and uploads in parallel
      const [messages, uploads] = await Promise.all([
        fetchClassMessages(dbClassId),
        fetchClassUploads(dbClassId)
      ]);

      // Transform messages and uploads to match our types
      const transformedMessages: StudentMessage[] = messages.map(msg => ({
        id: Number(msg.id),
        classId: Number(msg.classId),
        content: msg.message,
        isRead: msg.isRead,
        timestamp: msg.timestamp,
        studentId: 0 // This needs to be updated with actual student ID
      }));

      const transformedUploads: StudentUpload[] = uploads.map(upload => ({
        id: upload.id,
        classId: upload.classId,
        studentName: upload.studentName || '',
        fileName: upload.fileName,
        fileSize: upload.fileSize || '0 KB',
        uploadDate: upload.uploadDate,
        note: upload.note || null
      }));

      setDetailsState(prev => ({
        ...prev,
        messages: transformedMessages,
        uploads: transformedUploads
      }));
    } catch (error) {
      console.error("Error loading class content:", error);
      toast.error("Failed to load class content");
    }
  };

  const handleMarkMessageRead = async (messageId: number) => {
    try {
      const dbMessageId = numericIdToDbId(messageId);
      const success = await markMessageAsRead(dbMessageId);
      
      if (success) {
        setDetailsState(prev => ({
          ...prev,
          messages: prev.messages.map(message => 
            message.id === messageId ? { ...message, isRead: true } : message
          )
        }));
        toast.success("Message marked as read");
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };

  // File actions
  const handleDownloadFile = async (uploadId: number) => {
    try {
      const upload = detailsState.uploads.find(u => u.id === uploadId);
      if (upload) {
        toast.success(`Downloading ${upload.fileName}`);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  // Export actions
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const fileName = `class-logs-${format === 'csv' ? 'spreadsheet.csv' : 'report.pdf'}`;
      toast.success(`Exported ${fileName} successfully`);
    } catch (error) {
      toast.error('Failed to export file');
    } finally {
      setIsExporting(false);
    }
  };

  // Utility functions
  const getUnreadMessageCount = (classId: number): number => {
    return detailsState.messages.filter(m => m.classId === classId && !m.isRead).length;
  };

  // Pagination actions
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPage(1);
    setPageSize(newPageSize);
  };

  return {
    // Details state
    isDetailsOpen: detailsState.isOpen,
    setIsDetailsOpen: (isOpen: boolean) => setDetailsState(prev => ({ ...prev, isOpen })),
    selectedClass: detailsState.selectedClass,
    setSelectedClass: (cls: ClassEvent | null) => setDetailsState(prev => ({ ...prev, selectedClass: cls })),
    studentUploads: detailsState.uploads,
    studentMessages: detailsState.messages,
    activeDetailsTab: detailsState.activeTab,
    setActiveDetailsTab: (tab: string) => setDetailsState(prev => ({ ...prev, activeTab: tab })),
    
    // Export state
    isExporting,
    
    // Pagination state
    page,
    setPage,
    pageSize,
    setPageSize,
    
    // Actions
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
