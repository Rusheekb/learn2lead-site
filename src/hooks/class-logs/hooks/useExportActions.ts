
import { useState } from 'react';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { ExportFormat } from '@/types/classTypes';
import { exportClassLogs } from '@/services/exportService';

export const useExportActions = () => {
  const [isExporting, setIsExporting] = useState<boolean>(false);

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

  return {
    isExporting,
    handleExport,
  };
};
