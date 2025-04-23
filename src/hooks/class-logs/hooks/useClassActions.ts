
import { useState } from 'react';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { ExportFormat } from '@/types/classTypes';
import { exportClassLogs } from '@/services/exportService';
import {
  fetchClassMessages,
  markMessageAsRead,
} from '@/services/classMessagesService';
import {
  fetchClassUploads,
  downloadClassFile,
} from '@/services/classUploadsService';

export const useClassActions = (
  setStudentMessages: React.Dispatch<React.SetStateAction<any[]>>,
  studentMessages: any[],
  studentUploads: any[],
  setIsExporting: React.Dispatch<React.SetStateAction<boolean>>
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

  const handleDownloadFile = async (uploadId: string): Promise<void> => {
    try {
      const upload = studentUploads.find((u) => u.id === uploadId);
      if (!upload) throw new Error('Upload not found');

      await downloadClassFile(uploadId);
      toast.success(`Downloaded ${upload.fileName}`);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleExport = async (
    classes: ClassEvent[],
    format: ExportFormat
  ): Promise<boolean> => {
    try {
      setIsExporting(true);
      const success = await exportClassLogs(classes, format);
      return success;
    } catch (error) {
      console.error(`Failed to export classes as ${format}:`, error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  const getUnreadMessageCount = (classId: string): number => {
    return studentMessages.filter(
      (msg) => msg.classId === classId && !msg.isRead
    ).length;
  };

  return {
    handleMarkMessageRead,
    handleDownloadFile,
    handleExport,
    getUnreadMessageCount,
  };
};
