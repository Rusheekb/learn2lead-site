
import { useState, useEffect, useCallback } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function useStudentContent(selectedEvent: ClassEvent | null) {
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);

  // Fetch student messages and uploads when a class is selected
  useEffect(() => {
    const fetchStudentContent = async () => {
      if (!selectedEvent?.id) return;

      try {
        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('class_messages')
          .select('*')
          .eq('class_id', selectedEvent.id)
          .order('timestamp', { ascending: false });

        if (messagesError) throw messagesError;
        setStudentMessages(messagesData || []);

        // Fetch uploads
        const { data: uploadsData, error: uploadsError } = await supabase
          .from('class_uploads')
          .select('*')
          .eq('class_id', selectedEvent.id)
          .order('upload_date', { ascending: false });

        if (uploadsError) throw uploadsError;
        setStudentUploads(uploadsData || []);
      } catch (error: any) {
        console.error('Error fetching student content:', error.message);
        toast.error('Failed to load student messages and uploads');
      }
    };

    fetchStudentContent();
    
    // Set up realtime listeners for new messages and uploads
    if (selectedEvent?.id) {
      const messagesChannel = supabase
        .channel(`messages-${selectedEvent.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'class_messages',
            filter: `class_id=eq.${selectedEvent.id}`,
          },
          () => {
            fetchStudentContent();
          }
        )
        .subscribe();

      const uploadsChannel = supabase
        .channel(`uploads-${selectedEvent.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'class_uploads',
            filter: `class_id=eq.${selectedEvent.id}`,
          },
          () => {
            fetchStudentContent();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(uploadsChannel);
      };
    }
  }, [selectedEvent?.id]);

  // Mark a message as read
  const handleMarkMessageRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('class_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state to reflect the change
      setStudentMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    } catch (error: any) {
      console.error('Error marking message as read:', error);
      toast.error('Failed to update message status');
    }
  };

  // Download a student upload
  const handleDownloadFile = async (uploadId: string) => {
    try {
      const upload = studentUploads.find((u) => u.id === uploadId);
      if (!upload || !upload.file_path) {
        throw new Error('File not found');
      }

      const { data, error } = await supabase.storage
        .from('student-uploads')
        .download(upload.file_path);

      if (error) throw error;

      // Create a download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = upload.file_name || 'download';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  // Count unread messages for a class
  const getUnreadMessageCount = useCallback(
    (classId: string) => {
      if (selectedEvent?.id !== classId) return 0;
      return studentMessages.filter((msg) => !msg.is_read).length;
    },
    [studentMessages, selectedEvent?.id]
  );

  return {
    studentMessages,
    studentUploads,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
  };
}
