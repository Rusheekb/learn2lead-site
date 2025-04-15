import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeSubscription } from "@/utils/realtimeSubscription";
import { StudentMessage, StudentUpload } from "@/types/classTypes";

const useStudentRealtime = (
  studentName: string,
  setClasses: React.Dispatch<React.SetStateAction<any[]>>,
  setStudentMessages: React.Dispatch<React.SetStateAction<StudentMessage[]>>,
  setStudentUploads: React.Dispatch<React.SetStateAction<StudentUpload[]>>
) => {
  // Subscribe to real-time updates for class_logs
  useEffect(() => {
    const channel = createRealtimeSubscription({
      channelName: 'student-class-changes',
      tableName: 'class_logs',
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          // Check if this class is for the current student
          if (payload.new.student_name === studentName) {
            const newClass = {
              id: payload.new.id,
              title: payload.new.title,
              subject: payload.new.subject,
              tutorName: payload.new.tutor_name,
              studentName: payload.new.student_name,
              date: payload.new.date,
              startTime: payload.new.start_time.substring(0, 5),
              endTime: payload.new.end_time.substring(0, 5),
              status: payload.new.status,
              attendance: payload.new.attendance,
              zoomLink: payload.new.zoom_link,
              notes: payload.new.notes
            };
            
            setClasses(prevClasses => [...prevClasses, newClass]);
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update class if it's for the current student
          if (payload.new.student_name === studentName) {
            const updatedClass = {
              id: payload.new.id,
              title: payload.new.title,
              subject: payload.new.subject,
              tutorName: payload.new.tutor_name,
              studentName: payload.new.student_name,
              date: payload.new.date,
              startTime: payload.new.start_time.substring(0, 5),
              endTime: payload.new.end_time.substring(0, 5),
              status: payload.new.status,
              attendance: payload.new.attendance,
              zoomLink: payload.new.zoom_link,
              notes: payload.new.notes
            };
            
            setClasses(prevClasses => 
              prevClasses.map(cls => 
                cls.id === updatedClass.id ? updatedClass : cls
              )
            );
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove class if it was for the current student
          if (payload.old.student_name === studentName) {
            setClasses(prevClasses => 
              prevClasses.filter(cls => cls.id !== payload.old.id)
            );
          }
        }
      }
    });
    
    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Run once on component mount

  // Subscribe to real-time updates for class_messages
  useEffect(() => {
    const channel = createRealtimeSubscription({
      channelName: 'student-message-changes',
      tableName: 'class_messages',
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          // Add new message if it's for the current student
          if (payload.new.student_name === studentName) {
            const newMessage: StudentMessage = {
              id: payload.new.id,
              classId: payload.new.class_id,
              studentName: payload.new.student_name,
              message: payload.new.message,
              timestamp: payload.new.created_at,
              isRead: payload.new.is_read || false
            };
            
            setStudentMessages(prevMessages => [...prevMessages, newMessage]);
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update message if it's for the current student
          if (payload.new.student_name === studentName) {
            const updatedMessage: StudentMessage = {
              id: payload.new.id,
              classId: payload.new.class_id,
              studentName: payload.new.student_name,
              message: payload.new.message,
              timestamp: payload.new.created_at,
              isRead: payload.new.is_read || false
            };
            
            setStudentMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove message if it was for the current student
          if (payload.old.student_name === studentName) {
            setStudentMessages(prevMessages => 
              prevMessages.filter(msg => msg.id !== payload.old.id)
            );
          }
        }
      }
    });
    
    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Run once on component mount

  // Subscribe to real-time updates for class_uploads
  useEffect(() => {
    const channel = createRealtimeSubscription({
      channelName: 'student-upload-changes',
      tableName: 'class_uploads',
      onData: (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          // Add new upload if it's for the current student
          if (payload.new.student_name === studentName) {
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
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update upload if it's for the current student
          if (payload.new.student_name === studentName) {
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
              prevUploads.map(upload => 
                upload.id === updatedUpload.id ? updatedUpload : upload
              )
            );
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove upload if it was for the current student
          if (payload.old.student_name === studentName) {
            setStudentUploads(prevUploads => 
              prevUploads.filter(upload => upload.id !== payload.old.id)
            );
          }
        }
      }
    });
    
    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Run once on component mount

  return {
    // Return nothing as this hook just sets up subscriptions
  };
};

export default useStudentRealtime;
