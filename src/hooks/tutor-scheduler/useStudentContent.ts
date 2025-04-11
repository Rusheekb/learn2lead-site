
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchClassMessages, fetchClassUploads, markMessageAsRead } from "@/services/classService";
import { numericIdToDbId } from "@/utils/realtimeUtils";
import { StudentMessage, StudentUpload } from "@/components/shared/StudentContent";
import { ClassEvent } from "@/types/tutorTypes";

export const useStudentContent = (selectedEvent: ClassEvent | null) => {
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);

  // Load messages and uploads when a class is selected
  useEffect(() => {
    const loadClassContent = async () => {
      if (!selectedEvent || !selectedEvent.id) return;
      
      // Convert numeric ID to UUID-like string for database query
      const classId = numericIdToDbId(selectedEvent.id);
      
      try {
        // Load messages
        const messages = await fetchClassMessages(classId);
        setStudentMessages(messages);
        
        // Load uploads
        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error) {
        console.error("Error loading class content:", error);
        toast.error("Failed to load class content");
      }
    };
    
    loadClassContent();
  }, [selectedEvent]);

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
      } else {
        toast.error("Failed to mark message as read");
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };

  const handleDownloadFile = async (uploadId: number) => {
    try {
      // In a real implementation, we would fetch the file path from the database
      const upload = studentUploads.find(u => u.id === uploadId);
      if (upload) {
        // This would get a download URL in a real implementation
        toast.success(`Downloading ${upload.fileName}`);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const getUnreadMessageCount = (classId: number) => {
    return studentMessages.filter(m => m.classId === classId && !m.isRead).length;
  };

  return {
    studentUploads,
    studentMessages,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount
  };
};

export default useStudentContent;
