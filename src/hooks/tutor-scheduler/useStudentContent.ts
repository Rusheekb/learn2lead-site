
import { useState, useEffect, useCallback } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapToStudentMessage, mapToStudentUpload } from '@/services/utils/classMappers';
import { downloadClassFile } from '@/services/classUploadsService';

export default function useStudentContent(selectedEvent: ClassEvent | null) {
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);

  // Fetch student messages and uploads when a class is selected
  useEffect(() => {
    const fetchStudentContent = async () => {
      if (!selectedEvent?.id) return;

      try {
        // Messages functionality removed since table was deleted
        setStudentMessages([]);

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

  const handleMarkMessageRead = async (messageId: string) => {
    // Messages functionality removed since table was deleted
    console.log('Messages functionality removed');
  };

  // Download a student upload
  const handleDownloadFile = async (uploadId: string) => {
    try {
      await downloadClassFile(uploadId);
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
