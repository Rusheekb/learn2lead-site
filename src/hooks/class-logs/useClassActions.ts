
import { useState } from "react";
import { toast } from "sonner";
import { ClassDetailsState, ExportFormat } from "@/types/classTypes";
import { fetchClassMessages, markMessageAsRead } from "@/services/classMessagesService";
import { fetchClassUploads, downloadClassFile } from "@/services/classUploadsService";
import { updateClassLog, deleteClassLog } from "@/services/classLogsService";
import { exportClassLogs } from "@/services/exportService";
import { ClassEvent } from "@/types/tutorTypes";

interface UseClassActionsReturn extends ClassDetailsState {
  isExporting: boolean;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  handleClassClick: (cls: ClassEvent) => void;
  loadClassContent: (classId: string) => void;
  handleMarkMessageRead: (messageId: string) => Promise<void>;
  handleDownloadFile: (uploadId: string) => Promise<void>;
  handleUpdateStatus: (classId: string, status: string) => Promise<boolean>;
  handleUpdateAttendance: (classId: string, attendance: string) => Promise<boolean>;
  handleDeleteClass: (classId: string) => Promise<boolean>;
  handleExport: (classes: ClassEvent[], format: ExportFormat) => Promise<boolean>;
  getUnreadMessageCount: (classId: string) => number;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
}

const useClassActions = (): UseClassActionsReturn => {
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<ClassEvent | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>("details");
  const [uploads, setUploads] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const handleClassClick = (cls: ClassEvent) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
    setActiveDetailsTab("details");
    loadClassContent(cls.id);
  };

  const loadClassContent = async (classId: string) => {
    try {
      const [uploadsData, messagesData] = await Promise.all([
        fetchClassUploads(classId),
        fetchClassMessages(classId)
      ]);
      
      setUploads(uploadsData);
      setMessages(messagesData);
    } catch (error) {
      console.error("Failed to load class content:", error);
      toast.error("Failed to load class content");
    }
  };

  const handleMarkMessageRead = async (messageId: string): Promise<void> => {
    try {
      await markMessageAsRead(messageId);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
      toast.success("Message marked as read");
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };

  const handleDownloadFile = async (uploadId: string): Promise<void> => {
    try {
      const upload = uploads.find((u) => u.id === uploadId);
      if (!upload) throw new Error("Upload not found");
      
      await downloadClassFile(uploadId);
      toast.success(`Downloaded ${upload.fileName}`);
    } catch (error) {
      console.error("Failed to download file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleUpdateStatus = async (classId: string, status: string): Promise<boolean> => {
    try {
      await updateClassLog(classId, { status });
      toast.success("Class status updated");
      return true;
    } catch (error) {
      console.error("Failed to update class status:", error);
      toast.error("Failed to update class status");
      return false;
    }
  };

  const handleUpdateAttendance = async (classId: string, attendance: string): Promise<boolean> => {
    try {
      await updateClassLog(classId, { attendance });
      toast.success("Attendance updated");
      return true;
    } catch (error) {
      console.error("Failed to update attendance:", error);
      toast.error("Failed to update attendance");
      return false;
    }
  };

  const handleDeleteClass = async (classId: string): Promise<boolean> => {
    try {
      await deleteClassLog(classId);
      toast.success("Class deleted");
      return true;
    } catch (error) {
      console.error("Failed to delete class:", error);
      toast.error("Failed to delete class");
      return false;
    }
  };

  const handleExport = async (classes: ClassEvent[], format: ExportFormat): Promise<boolean> => {
    try {
      setIsExporting(true);
      const success = await exportClassLogs(classes, format);
      return success;
    } catch (error) {
      console.error(`Failed to export classes as ${format}:`, error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  const getUnreadMessageCount = (classId: string): number => {
    return messages.filter(msg => msg.classId === classId && !msg.isRead).length;
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  return {
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    setSelectedClass,
    activeDetailsTab,
    setActiveDetailsTab,
    uploads,
    messages,
    isExporting,
    page,
    setPage,
    pageSize,
    setPageSize,
    handleClassClick,
    loadClassContent,
    handleMarkMessageRead,
    handleDownloadFile,
    handleUpdateStatus,
    handleUpdateAttendance,
    handleDeleteClass,
    handleExport,
    getUnreadMessageCount,
    handlePageChange,
    handlePageSizeChange
  };
};

export default useClassActions;
