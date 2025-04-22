import { supabase } from '@/integrations/supabase/client';
import { StudentMessage } from '@/types/classTypes';

export const useMessageSubscription = (
  currentStudentName: string,
  setStudentMessages: React.Dispatch<React.SetStateAction<StudentMessage[]>>
) => {
  // Subscribe to messages
  const messagesChannel = supabase
    .channel('student-messages-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'class_messages',
      },
      (payload: any) => {
        if (payload.new && payload.new.student_name === currentStudentName) {
          if (payload.eventType === 'INSERT') {
            const newMessage: StudentMessage = {
              id: payload.new.id,
              content: payload.new.message,
              message: payload.new.message,
              classId: payload.new.class_id,
              studentName: payload.new.student_name,
              timestamp: payload.new.created_at || payload.new.timestamp,
              read: payload.new.is_read,
              isRead: payload.new.is_read,
              sender: 'student',
            };

            setStudentMessages((prevMessages) => [...prevMessages, newMessage]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage: StudentMessage = {
              id: payload.new.id,
              content: payload.new.message,
              message: payload.new.message,
              classId: payload.new.class_id,
              studentName: payload.new.student_name,
              timestamp: payload.new.created_at || payload.new.timestamp,
              read: payload.new.is_read,
              isRead: payload.new.is_read,
              sender: 'student',
            };

            setStudentMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const messageId = payload.old.id;
            setStudentMessages((prevMessages) =>
              prevMessages.filter((msg) => msg.id !== messageId)
            );
          }
        }
      }
    )
    .subscribe();

  return messagesChannel;
};
