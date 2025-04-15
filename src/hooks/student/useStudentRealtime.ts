
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClassItem, StudentMessage, StudentUpload } from '@/types/classTypes';
import { createRealtimeSubscription } from '@/utils/realtimeSubscription';

// Define the database record types to match Supabase tables
interface ClassLogRecord {
  id: string;
  title?: string;
  subject?: string;
  tutor_name?: string;
  student_name?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  attendance?: string;
  zoom_link?: string;
  notes?: string;
  [key: string]: any;
}

interface ClassMessageRecord {
  id: string;
  class_id: string;
  student_name: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  created_at?: string;
  [key: string]: any;
}

interface ClassUploadRecord {
  id: string;
  class_id: string;
  student_name: string;
  file_name: string;
  file_path?: string;
  file_size: string;
  upload_date: string;
  note: string | null;
  created_at?: string;
  [key: string]: any;
}

const useStudentRealtime = (
  currentStudentName: string,
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>,
  setStudentMessages: React.Dispatch<React.SetStateAction<StudentMessage[]>>,
  setStudentUploads: React.Dispatch<React.SetStateAction<StudentUpload[]>>
) => {
  // Subscribe to realtime updates
  useEffect(() => {
    // Subscribe to class changes
    const classesChannel = createRealtimeSubscription<ClassLogRecord>({
      channelName: 'student-class-changes',
      tableName: 'class_logs',
      onData: (payload) => {
        if (payload.new && payload.new.student_name === currentStudentName) {
          if (payload.eventType === 'INSERT') {
            const newClass: ClassItem = {
              id: payload.new.id,
              title: payload.new.title || '',
              subject: payload.new.subject || '',
              tutorName: payload.new.tutor_name || '',
              studentName: payload.new.student_name || '',
              date: payload.new.date || '',
              startTime: payload.new.start_time || '',
              endTime: payload.new.end_time || '',
              status: payload.new.status || 'upcoming',
              attendance: payload.new.attendance || 'pending',
              zoomLink: payload.new.zoom_link || '',
              notes: payload.new.notes || '',
              subjectId: payload.new.subject || '',
              recurring: false
            };
            
            setClasses(prevClasses => [...prevClasses, newClass]);
            toast.success(`New class added: ${newClass.title}`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedClass: ClassItem = {
              id: payload.new.id,
              title: payload.new.title || '',
              subject: payload.new.subject || '',
              tutorName: payload.new.tutor_name || '',
              studentName: payload.new.student_name || '',
              date: payload.new.date || '',
              startTime: payload.new.start_time || '',
              endTime: payload.new.end_time || '',
              status: payload.new.status || 'upcoming',
              attendance: payload.new.attendance || 'pending',
              zoomLink: payload.new.zoom_link || '',
              notes: payload.new.notes || '',
              subjectId: payload.new.subject || '',
              recurring: false
            };
            
            setClasses(prevClasses => 
              prevClasses.map(cls => cls.id === updatedClass.id ? updatedClass : cls)
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const classId = payload.old.id;
            setClasses(prevClasses => prevClasses.filter(cls => cls.id !== classId));
          }
        }
      }
    });
    
    // Subscribe to messages
    const messagesChannel = createRealtimeSubscription<ClassMessageRecord>({
      channelName: 'student-messages-changes',
      tableName: 'class_messages',
      onData: (payload) => {
        if (payload.new && payload.new.student_name === currentStudentName) {
          if (payload.eventType === 'INSERT') {
            const newMessage: StudentMessage = {
              id: payload.new.id,
              classId: payload.new.class_id,
              studentName: payload.new.student_name,
              message: payload.new.message,
              timestamp: payload.new.created_at || payload.new.timestamp,
              isRead: payload.new.is_read
            };
            
            setStudentMessages(prevMessages => [...prevMessages, newMessage]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage: StudentMessage = {
              id: payload.new.id,
              classId: payload.new.class_id,
              studentName: payload.new.student_name,
              message: payload.new.message,
              timestamp: payload.new.created_at || payload.new.timestamp,
              isRead: payload.new.is_read
            };
            
            setStudentMessages(prevMessages => 
              prevMessages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const messageId = payload.old.id;
            setStudentMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
          }
        }
      }
    });
    
    // Subscribe to uploads
    const uploadsChannel = createRealtimeSubscription<ClassUploadRecord>({
      channelName: 'student-uploads-changes',
      tableName: 'class_uploads',
      onData: (payload) => {
        if (payload.new && payload.new.student_name === currentStudentName) {
          if (payload.eventType === 'INSERT') {
            const newUpload: StudentUpload = {
              id: payload.new.id,
              classId: payload.new.class_id,
              studentName: payload.new.student_name,
              fileName: payload.new.file_name,
              fileSize: payload.new.file_size,
              uploadDate: payload.new.upload_date,
              note: payload.new.note
            };
            
            setStudentUploads(prevUploads => [...prevUploads, newUpload]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedUpload: StudentUpload = {
              id: payload.new.id,
              classId: payload.new.class_id,
              studentName: payload.new.student_name,
              fileName: payload.new.file_name,
              fileSize: payload.new.file_size,
              uploadDate: payload.new.upload_date,
              note: payload.new.note
            };
            
            setStudentUploads(prevUploads => 
              prevUploads.map(upload => upload.id === updatedUpload.id ? updatedUpload : upload)
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const uploadId = payload.old.id;
            setStudentUploads(prevUploads => prevUploads.filter(upload => upload.id !== uploadId));
          }
        }
      }
    });
    
    // Cleanup subscriptions when component unmounts
    return () => {
      supabase.removeChannel(classesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(uploadsChannel);
    };
  }, [currentStudentName, setClasses, setStudentMessages, setStudentUploads]);
};

export default useStudentRealtime;
