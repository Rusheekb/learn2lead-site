
import { useState, useEffect, useCallback } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapToStudentMessage, mapToStudentUpload } from '@/services/utils/classMappers';

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
        
        // Map database records to application types
        const mappedMessages = (messagesData || []).map(msg => mapToStudentMessage(msg));
        setStudentMessages(mappedMessages);

        // Fetch uploads
        const { data: uploadsData, error: uploadsError } = await supabase
          .from('class_uploads')
          .select('*')
          .eq('class_id', selectedEvent.id)
          .order('upload_date', { ascending: false });

        if (uploadsError) throw uploadsError;
        
        // Map database records to application types
        const mappedUploads = (uploadsData || []).map(upload => mapToStudentUpload(upload));
        setStudentUploads(mappedUploads);
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
            // Refetch data when changes are detected
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
            // Refetch data when changes are detected
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
          msg.id === messageId ? { ...msg, isRead: true, read: true } : msg
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
      if (!upload) {
        throw new Error('File not found');
      }
      
      // Get original file data from database to get file_path
      const { data, error } = await supabase
        .from('class_uploads')
        .select('file_path')
        .eq('id', uploadId)
        .single();
        
      if (error || !data) throw error || new Error('File path not found');

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('student-uploads')
        .download(data.file_path);

      if (downloadError) throw downloadError;

      // Create a download link
      const url = URL.createObjectURL(fileData);
      const link = document.createElement('a');
      link.href = url;
      link.download = upload.fileName || 'download';
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
      return studentMessages.filter((msg) => !msg.isRead && !msg.read).length;
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
