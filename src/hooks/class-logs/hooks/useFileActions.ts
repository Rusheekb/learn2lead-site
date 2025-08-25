
import { toast } from 'sonner';
import { StudentUpload } from '@/types/classTypes';
import { downloadClassFile, viewClassFile, deleteClassFile } from '@/services/classUploadsService';

export const useFileActions = (
  studentUploads: StudentUpload[],
  onFileDeleted?: () => void
) => {
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

  const handleViewFile = async (uploadId: string): Promise<void> => {
    try {
      await viewClassFile(uploadId);
    } catch (error) {
      console.error('Failed to view file:', error);
      toast.error('Failed to open file');
    }
  };

  const handleDeleteFile = async (uploadId: string): Promise<void> => {
    try {
      const upload = studentUploads.find((u) => u.id === uploadId);
      if (!upload) throw new Error('Upload not found');

      if (window.confirm(`Are you sure you want to delete ${upload.fileName}?`)) {
        await deleteClassFile(uploadId);
        onFileDeleted?.();
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  return {
    handleDownloadFile,
    handleViewFile,
    handleDeleteFile,
  };
};
