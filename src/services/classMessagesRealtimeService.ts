
import { supabase } from '@/integrations/supabase/client';
import { StudentMessage } from '@/types/classTypes';
import { mapToStudentMessage } from './classMessagesService';

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
          const newMessage = mapToStudentMessage(payload.new);
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
          const updatedMessage = mapToStudentMessage(payload.new);
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
          const newMessage = mapToStudentMessage(payload.new);
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
          const updatedMessage = mapToStudentMessage(payload.new);
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
