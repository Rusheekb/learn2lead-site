
import { useState } from 'react';
import { toast } from 'sonner';
import { StudentMessage } from '@/types/classTypes';
import { markMessageAsRead } from '@/services/classMessagesService';

export const useMessageActions = (
  setStudentMessages: React.Dispatch<React.SetStateAction<StudentMessage[]>>,
  studentMessages: StudentMessage[]
) => {
  const handleMarkMessageRead = async (messageId: string): Promise<void> => {
    try {
      await markMessageAsRead(messageId);
      setStudentMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
      toast.success('Message marked as read');
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      toast.error('Failed to mark message as read');
    }
  };

  const getUnreadMessageCount = (classId: string): number => {
    return studentMessages.filter(
      (msg) => msg.classId === classId && !msg.isRead
    ).length;
  };

  return {
    handleMarkMessageRead,
    getUnreadMessageCount,
  };
};
