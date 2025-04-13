
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeSubscription } from "@/utils/realtimeSubscription";
import { dbIdToNumeric } from "@/utils/realtimeUtils";
import { StudentMessage, StudentUpload } from "@/components/shared/StudentContent";

// Define types for the database records
interface ClassLogRecord {
  id: string;
  title: string;
  subject: string;
  tutor_name: string;
  student_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  attendance: string;
  zoom_link: string | null;
  notes: string | null;
}

interface ClassMessageRecord {
  id: string;
  class_id: string;
  student_name: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}

interface ClassUploadRecord {
  id: string;
  class_id: string;
  student_name: string;
  file_name: string;
  file_size: string;
  upload_date: string;
  note: string | null;
}

// Define types for the component's props
interface ClassItem {
  id: number;
  title: string;
  subject: string;
  tutorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  attendance: string;
  zoomLink: string;
  notes: string;
  studentName: string;
}

export const useStudentRealtime = (
  studentName: string,
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>,
  setMessages: React.Dispatch<React.SetStateAction<StudentMessage[]>>,
  setUploads: React.Dispatch<React.SetStateAction<StudentUpload[]>>
) => {
  useEffect(() => {
    // Subscribe to class changes
    const classChannel = createRealtimeSubscription<ClassLogRecord>({
      channelName: 'student-class-updates',
      tableName: 'class_logs',
      onData: (payload) => {
        // Only handle new classes or updates where this student is involved
        if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') 
            && payload.new 
            && payload.new.student_name === studentName) {
          
          const classItem: ClassItem = {
            id: dbIdToNumeric(payload.new.id),
            title: payload.new.title,
            subject: payload.new.subject,
            tutorName: payload.new.tutor_name,
            date: payload.new.date,
            startTime: payload.new.start_time.substring(0, 5),
            endTime: payload.new.end_time.substring(0, 5),
            status: payload.new.status,
            attendance: payload.new.attendance,
            zoomLink: payload.new.zoom_link || "",
            notes: payload.new.notes || "",
            studentName: payload.new.student_name
          };

          if (payload.eventType === 'INSERT') {
            setClasses(prevClasses => [...prevClasses, classItem]);
            toast.success(`New class scheduled: ${classItem.title}`);
          } else {
            setClasses(prevClasses => 
              prevClasses.map(cls => 
                cls.id === classItem.id ? classItem : cls
              )
            );
            toast.info(`Class updated: ${classItem.title}`);
          }
        } else if (payload.eventType === 'DELETE' 
                  && payload.old 
                  && payload.old.student_name === studentName) {
          
          const classId = dbIdToNumeric(payload.old.id);
          setClasses(prevClasses => 
            prevClasses.filter(cls => cls.id !== classId)
          );
          toast.info(`Class removed: ${payload.old.title}`);
        }
      }
    });

    // Subscribe to message changes
    const messageChannel = createRealtimeSubscription<ClassMessageRecord>({
      channelName: 'student-message-updates',
      tableName: 'class_messages',
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.student_name === studentName) {
          const newMessage: StudentMessage = {
            id: dbIdToNumeric(payload.new.id),
            classId: dbIdToNumeric(payload.new.class_id),
            studentName: payload.new.student_name,
            message: payload.new.message,
            timestamp: payload.new.timestamp,
            isRead: payload.new.is_read
          };
          
          setMessages(prevMessages => [...prevMessages, newMessage]);
          toast.success(`Message sent successfully`);
        } else if (payload.eventType === 'UPDATE' && payload.new.student_name === studentName) {
          const updatedMessage: StudentMessage = {
            id: dbIdToNumeric(payload.new.id),
            classId: dbIdToNumeric(payload.new.class_id),
            studentName: payload.new.student_name,
            message: payload.new.message,
            timestamp: payload.new.timestamp,
            isRead: payload.new.is_read
          };
          
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      }
    });

    // Subscribe to upload changes
    const uploadChannel = createRealtimeSubscription<ClassUploadRecord>({
      channelName: 'student-upload-updates',
      tableName: 'class_uploads',
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.student_name === studentName) {
          const newUpload: StudentUpload = {
            id: dbIdToNumeric(payload.new.id),
            classId: dbIdToNumeric(payload.new.class_id),
            studentName: payload.new.student_name,
            fileName: payload.new.file_name,
            fileSize: payload.new.file_size,
            uploadDate: payload.new.upload_date,
            note: payload.new.note || undefined
          };
          
          setUploads(prevUploads => [...prevUploads, newUpload]);
          toast.success(`File uploaded successfully`);
        }
      }
    });

    // Cleanup subscriptions when component unmounts
    return () => {
      supabase.removeChannel(classChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(uploadChannel);
    };
  }, [studentName]);
};

export default useStudentRealtime;
