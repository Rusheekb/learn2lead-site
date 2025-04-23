
import { useMessageActions } from './useMessageActions';
import { useFileActions } from './useFileActions';
import { useExportActions } from './useExportActions';
import { StudentMessage, StudentUpload } from '@/types/classTypes';

export const useClassActions = (
  setStudentMessages: React.Dispatch<React.SetStateAction<StudentMessage[]>>,
  studentMessages: StudentMessage[],
  studentUploads: StudentUpload[],
  setIsExporting: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { handleMarkMessageRead, getUnreadMessageCount } = useMessageActions(
    setStudentMessages,
    studentMessages
  );
  
  const { handleDownloadFile } = useFileActions(studentUploads);
  
  const { handleExport } = useExportActions();

  return {
    handleMarkMessageRead,
    handleDownloadFile,
    handleExport,
    getUnreadMessageCount,
  };
};
