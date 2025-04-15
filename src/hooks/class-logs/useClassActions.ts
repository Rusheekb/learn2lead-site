
import { useState } from "react";
import { ClassEvent } from "@/types/tutorTypes";
import { toast } from "sonner";
import { 
  deleteClassLog, 
  updateClassLogStatus, 
  updateClassLogAttendance 
} from "@/services/classLogsService";
import { exportToCsv, exportToPdf, exportClassLogs } from "@/services/exportService";
import { ExportFormat } from "@/types/classTypes";

export default function useClassActions() {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleUpdateStatus = async (classId: string, status: string) => {
    try {
      const success = await updateClassLogStatus(classId, status);
      if (success) {
        toast.success(`Class status updated to ${status}`);
        return true;
      } else {
        toast.error("Failed to update class status");
        return false;
      }
    } catch (error) {
      console.error("Error updating class status:", error);
      toast.error("Error updating class status");
      return false;
    }
  };

  const handleUpdateAttendance = async (classId: string, attendance: string) => {
    try {
      const success = await updateClassLogAttendance(classId, attendance);
      if (success) {
        toast.success(`Attendance marked as ${attendance}`);
        return true;
      } else {
        toast.error("Failed to update attendance");
        return false;
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Error updating attendance");
      return false;
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const success = await deleteClassLog(classId);
      if (success) {
        toast.success("Class deleted successfully");
        return true;
      } else {
        toast.error("Failed to delete class");
        return false;
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Error deleting class");
      return false;
    }
  };

  const handleExport = async (classes: ClassEvent[], format: ExportFormat) => {
    setIsExporting(true);
    try {
      let success = false;
      
      if (format === 'csv') {
        success = await exportToCsv(classes);
      } else if (format === 'pdf') {
        success = await exportToPdf(classes);
      }
      
      setIsExporting(false);
      return success;
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      toast.error(`Failed to export to ${format}`);
      setIsExporting(false);
      return false;
    }
  };

  return {
    isExporting,
    handleUpdateStatus,
    handleUpdateAttendance,
    handleDeleteClass,
    handleExport,
  };
}
