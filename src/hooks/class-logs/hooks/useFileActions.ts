
import { toast } from 'sonner';
import { StudentUpload } from '@/types/classTypes';
import { downloadClassFile } from '@/services/classUploadsService';

export const useFileActions = (studentUploads: StudentUpload[]) => {
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

  return {
    handleDownloadFile,
  };
};
