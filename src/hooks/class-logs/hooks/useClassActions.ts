

import { useFileActions } from './useFileActions';
import { useExportActions } from './useExportActions';
import { StudentMessage, StudentUpload } from '@/types/classTypes';

export const useClassActions = (
  studentUploads: StudentUpload[],
  setIsExporting: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Message actions removed - messaging functionality disabled
  
  const { handleDownloadFile } = useFileActions(studentUploads);
  
  const { handleExport } = useExportActions();

  return {
    handleDownloadFile,
    handleExport,
  };
};
