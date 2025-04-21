import { supabase } from '@/integrations/supabase/client';
import { StudentUpload } from '@/types/classTypes';

export const useUploadSubscription = (
  currentStudentName: string,
  setStudentUploads: React.Dispatch<React.SetStateAction<StudentUpload[]>>
) => {
  // Subscribe to uploads
  const uploadsChannel = supabase.channel('student-uploads-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'class_uploads'
      },
      (payload: any) => {
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
    )
    .subscribe();
    
  return uploadsChannel;
};
