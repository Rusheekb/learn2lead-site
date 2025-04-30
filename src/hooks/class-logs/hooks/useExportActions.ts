
import { useState } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { ExportFormat } from '@/types/classTypes';
import { exportClassLogs } from '@/services/exportService';
import { toast } from 'sonner';

export const useExportActions = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (
    classes: ClassEvent[],
    format: ExportFormat = 'csv'
  ) => {
    if (!classes || classes.length === 0) {
      toast.error('No class logs to export');
      return;
    }

    setIsExporting(true);
    try {
      const success = await exportClassLogs(classes, format);
      if (success) {
        toast.success(`Successfully exported ${classes.length} classes as ${format.toUpperCase()}`);
      } else {
        toast.error(`Failed to export as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      toast.error(`Error exporting as ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    handleExport,
  };
};
