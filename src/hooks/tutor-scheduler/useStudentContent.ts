
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

interface UseStudentContentReturn {
  studentMessages: StudentMessage[];
  studentUploads: StudentUpload[];
  handleMarkMessageRead: (messageId: string) => Promise<void>;
  handleDownloadFile: (uploadId: string) => Promise<void>;
  getUnreadMessageCount: (classId: string) => number;
}

export const useStudentContent = (selectedEvent: ClassEvent | null): UseStudentContentReturn => {
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  
  useEffect(() => {
    if (!selectedEvent) return;
    
    const loadStudentContent = async (): Promise<void> => {
      try {
        const classId = selectedEvent.id;
        
        const messages = await fetchClassMessages(classId);
        setStudentMessages(messages);
        
        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error: any) {
        console.error("Error loading student content:", error);
        toast.error("Failed to load student content");
      }
    };
    
    loadStudentContent();
  }, [selectedEvent]);

  const handleMarkMessageRead = async (messageId: string): Promise<void> => {
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
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };
  
  const handleDownloadFile = async (uploadId: string): Promise<void> => {
    try {
      const success = await downloadClassFile(uploadId);
      
      if (success) {
        const upload = studentUploads.find(u => u.id === uploadId);
        if (upload) {
          toast.success(`Downloading ${upload.fileName}`);
        }
        return;
      }
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };
  
  const getUnreadMessageCount = (classId: string): number => {
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
