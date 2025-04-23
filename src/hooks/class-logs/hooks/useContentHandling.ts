
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { fetchClassMessages } from '@/services/classMessagesService';
import { fetchClassUploads } from '@/services/classUploadsService';

export const useContentHandling = () => {
  const handleClassClick = async (
    cls: ClassEvent,
    setSelectedClass: (cls: ClassEvent | null) => void,
    setIsDetailsOpen: (open: boolean) => void,
    setActiveDetailsTab: (tab: string) => void,
    loadClassContent: (classId: string) => Promise<void>
  ) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
    setActiveDetailsTab('details');
    await loadClassContent(cls.id);
  };

  const loadClassContent = async (
    classId: string,
    setStudentUploads: React.Dispatch<React.SetStateAction<any[]>>,
    setStudentMessages: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    try {
      const [uploadsData, messagesData] = await Promise.all([
        fetchClassUploads(classId),
        fetchClassMessages(classId),
      ]);

      setStudentUploads(uploadsData);
      setStudentMessages(messagesData);
    } catch (error) {
      console.error('Failed to load class content:', error);
      toast.error('Failed to load class content');
    }
  };

  return {
    handleClassClick,
    loadClassContent,
  };
};
