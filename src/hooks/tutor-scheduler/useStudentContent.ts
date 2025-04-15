
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ClassEvent } from "@/types/tutorTypes";
import { StudentMessage, StudentUpload } from "@/types/classTypes";
import { 
  fetchClassMessages, 
  markMessageAsRead,
  createClassMessage
} from "@/services/classMessagesService";
import { 
  fetchClassUploads,
  downloadClassFile
} from "@/services/classUploadsService";

export const useStudentContent = (selectedEvent: ClassEvent | null) => {
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  
  // Load messages and uploads when selected event changes
  useEffect(() => {
    if (!selectedEvent) return;
    
    const loadStudentContent = async () => {
      try {
        const classId = selectedEvent.id;
        
        const messages = await fetchClassMessages(classId);
        setStudentMessages(messages);
        
        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error) {
        console.error("Error loading student content:", error);
        toast.error("Failed to load student content");
      }
    };
    
    loadStudentContent();
  }, [selectedEvent]);

  // Mark a message as read
  const handleMarkMessageRead = async (messageId: string) => {
    try {
      const success = await markMessageAsRead(messageId);
      
      if (success) {
        setStudentMessages(messages =>
          messages.map(msg =>
            msg.id === messageId
              ? { ...msg, isRead: true }
              : msg
          )
        );
        return;
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };
  
  // Download a file
  const handleDownloadFile = async (uploadId: string) => {
    try {
      const success = await downloadClassFile(uploadId);
      
      if (success) {
        const upload = studentUploads.find(u => u.id === uploadId);
        if (upload) {
          toast.success(`Downloading ${upload.fileName}`);
        }
        return;
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };
  
  // Get count of unread messages for a class
  const getUnreadMessageCount = (classId: string) => {
    return studentMessages.filter(msg => msg.classId === classId && !msg.isRead).length;
  };

  return {
    studentMessages,
    studentUploads,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount
  };
};

export default useStudentContent;
