
import { supabase } from '@/integrations/supabase/client';
import { StudentMessage } from '@/types/classTypes';
import { ClassMessageRecord, mapToStudentMessage } from './classMessagesService';

// Set up a realtime subscription for messages for a specific class
export const subscribeToClassMessages = (
  classId: string,
  onNewMessage: (message: StudentMessage) => void
) => {
  const channel = supabase
    .channel(`class-messages-${classId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'class_messages',
        filter: `class_id=eq.${classId}`,
      },
      (payload) => {
        console.log('New message received:', payload);
        if (payload.new) {
          // Cast to ClassMessageRecord to ensure type safety
          const messageRecord = {
            id: payload.new.id,
            class_id: payload.new.class_id,
            student_name: payload.new.student_name,
            message: payload.new.message,
            timestamp: payload.new.timestamp || new Date().toISOString(),
            is_read: payload.new.is_read || false,
            created_at: payload.new.created_at
          } as ClassMessageRecord;
          
          const newMessage = mapToStudentMessage(messageRecord);
          onNewMessage(newMessage);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'class_messages',
        filter: `class_id=eq.${classId}`,
      },
      (payload) => {
        console.log('Message updated:', payload);
        if (payload.new) {
          // Cast to ClassMessageRecord to ensure type safety
          const messageRecord = {
            id: payload.new.id,
            class_id: payload.new.class_id,
            student_name: payload.new.student_name,
            message: payload.new.message,
            timestamp: payload.new.timestamp || new Date().toISOString(),
            is_read: payload.new.is_read || false,
            created_at: payload.new.created_at
          } as ClassMessageRecord;
          
          const updatedMessage = mapToStudentMessage(messageRecord);
          onNewMessage(updatedMessage);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.log('Unsubscribing from class messages:', classId);
    supabase.removeChannel(channel);
  };
};

// Set up realtime subscription for all class messages (admin view)
export const subscribeToAllClassMessages = (
  onNewMessage: (message: StudentMessage) => void
) => {
  const channel = supabase
    .channel('all-class-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'class_messages',
      },
      (payload) => {
        console.log('New message received (all):', payload);
        if (payload.new) {
          // Cast to ClassMessageRecord to ensure type safety
          const messageRecord = {
            id: payload.new.id,
            class_id: payload.new.class_id,
            student_name: payload.new.student_name,
            message: payload.new.message,
            timestamp: payload.new.timestamp || new Date().toISOString(),
            is_read: payload.new.is_read || false,
            created_at: payload.new.created_at
          } as ClassMessageRecord;
          
          const newMessage = mapToStudentMessage(messageRecord);
          onNewMessage(newMessage);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'class_messages',
      },
      (payload) => {
        console.log('Message updated (all):', payload);
        if (payload.new) {
          // Cast to ClassMessageRecord to ensure type safety
          const messageRecord = {
            id: payload.new.id,
            class_id: payload.new.class_id,
            student_name: payload.new.student_name,
            message: payload.new.message,
            timestamp: payload.new.timestamp || new Date().toISOString(),
            is_read: payload.new.is_read || false,
            created_at: payload.new.created_at
          } as ClassMessageRecord;
          
          const updatedMessage = mapToStudentMessage(messageRecord);
          onNewMessage(updatedMessage);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.log('Unsubscribing from all class messages');
    supabase.removeChannel(channel);
  };
};
