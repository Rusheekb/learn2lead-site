
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeSubscription } from "@/utils/realtimeSubscription";
import { dbIdToNumeric } from "@/utils/realtimeUtils";
import { ClassItem } from "@/types/classTypes";

export const useStudentRealtime = (
  currentStudentName: string,
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  setUploads: React.Dispatch<React.SetStateAction<any[]>>
) => {
  // Subscribe to real-time updates for classes
  useEffect(() => {
    const classChannel = createRealtimeSubscription({
      channelName: 'student-class-updates',
      tableName: 'class_logs',
      filter: `student_name=eq.${currentStudentName}`,
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          handleClassInserted(payload.new);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          handleClassUpdated(payload.new);
        } else if (payload.eventType === 'DELETE' && payload.old) {
          handleClassDeleted(payload.old);
        }
      }
    });

    // Subscribe to real-time updates for messages
    const messageChannel = createRealtimeSubscription({
      channelName: 'student-message-updates',
      tableName: 'class_messages',
      filter: `student_name=eq.${currentStudentName}`,
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          handleMessageInserted(payload.new);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          handleMessageUpdated(payload.new);
        }
      }
    });

    // Subscribe to real-time updates for uploads
    const uploadChannel = createRealtimeSubscription({
      channelName: 'student-upload-updates',
      tableName: 'class_uploads',
      filter: `student_name=eq.${currentStudentName}`,
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          handleUploadInserted(payload.new);
        }
      }
    });
    
    return () => {
      supabase.removeChannel(classChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(uploadChannel);
    };
  }, [currentStudentName]);

  const handleClassInserted = (newClass: any) => {
    const classItem: ClassItem = {
      id: newClass.id.toString(),
      title: newClass.title || `Class with ${newClass.tutor_name}`,
      subject: newClass.subject,
      tutorName: newClass.tutor_name,
      studentName: newClass.student_name,
      date: newClass.date,
      startTime: newClass.start_time?.substring(0, 5) || "00:00",
      endTime: newClass.end_time?.substring(0, 5) || "00:00",
      status: newClass.status || "upcoming",
      attendance: newClass.attendance || "pending",
      zoomLink: newClass.zoom_link || "",
      notes: newClass.notes || "",
    };

    setClasses(prevClasses => [...prevClasses, classItem]);
    toast.success(`New class scheduled: ${classItem.title}`);
  };

  const handleClassUpdated = (updatedClass: any) => {
    const classItem: ClassItem = {
      id: updatedClass.id.toString(),
      title: updatedClass.title || `Class with ${updatedClass.tutor_name}`,
      subject: updatedClass.subject,
      tutorName: updatedClass.tutor_name,
      studentName: updatedClass.student_name,
      date: updatedClass.date,
      startTime: updatedClass.start_time?.substring(0, 5) || "00:00",
      endTime: updatedClass.end_time?.substring(0, 5) || "00:00",
      status: updatedClass.status || "upcoming",
      attendance: updatedClass.attendance || "pending",
      zoomLink: updatedClass.zoom_link || "",
      notes: updatedClass.notes || "",
    };

    setClasses(prevClasses => 
      prevClasses.map(cls => 
        cls.id === classItem.id ? classItem : cls
      )
    );
    
    toast.info(`Class updated: ${classItem.title}`);
  };

  const handleClassDeleted = (deletedClass: any) => {
    const classId = deletedClass.id.toString();
    
    setClasses(prevClasses => 
      prevClasses.filter(cls => cls.id !== classId)
    );
    
    toast.info(`Class removed: ${deletedClass.title || 'Untitled Class'}`);
  };

  const handleMessageInserted = (newMessage: any) => {
    const message = {
      id: newMessage.id.toString(),
      classId: newMessage.class_id.toString(),
      studentName: newMessage.student_name,
      message: newMessage.message,
      timestamp: newMessage.timestamp,
      isRead: newMessage.is_read
    };
    
    setMessages(prevMessages => [...prevMessages, message]);
    toast.success("New message received!");
  };

  const handleMessageUpdated = (updatedMessage: any) => {
    const message = {
      id: updatedMessage.id.toString(),
      classId: updatedMessage.class_id.toString(),
      studentName: updatedMessage.student_name,
      message: updatedMessage.message,
      timestamp: updatedMessage.timestamp,
      isRead: updatedMessage.is_read
    };
    
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === message.id ? message : msg
      )
    );
  };

  const handleUploadInserted = (newUpload: any) => {
    const upload = {
      id: newUpload.id.toString(),
      classId: newUpload.class_id.toString(),
      studentName: newUpload.student_name,
      fileName: newUpload.file_name,
      fileSize: newUpload.file_size,
      uploadDate: newUpload.upload_date,
      note: newUpload.note
    };
    
    setUploads(prevUploads => [...prevUploads, upload]);
    toast.success("New file uploaded!");
  };
};

export default useStudentRealtime;
