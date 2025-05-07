
import { toast } from 'sonner';
import { updateClassLog, deleteClassLog } from '@/services/classLogsService';
import { ClassStatus, AttendanceStatus, isValidClassStatus, isValidAttendanceStatus } from '@/types/tutorTypes';

export const useStatusHandling = () => {
  const handleUpdateStatus = async (
    classId: string,
    status: string
  ): Promise<boolean> => {
    try {
      const validStatus: ClassStatus | undefined = isValidClassStatus(status) ? status as ClassStatus : undefined;
      if (!validStatus) {
        toast.error('Invalid class status');
        return false;
      }
      
      // Use the database field name format - "Status" instead of "status"
      await updateClassLog(classId, { "Status": validStatus });
      toast.success('Class status updated');
      return true;
    } catch (error) {
      console.error('Failed to update class status:', error);
      toast.error('Failed to update class status');
      return false;
    }
  };

  const handleUpdateAttendance = async (
    classId: string,
    attendance: string
  ): Promise<boolean> => {
    try {
      const validAttendance: AttendanceStatus | undefined = isValidAttendanceStatus(attendance) ? attendance as AttendanceStatus : undefined;
      if (!validAttendance) {
        toast.error('Invalid attendance status');
        return false;
      }
      
      // Use the database field name format - "Attendance" instead of "attendance"
      await updateClassLog(classId, { "Attendance": validAttendance });
      toast.success('Attendance updated');
      return true;
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast.error('Failed to update attendance');
      return false;
    }
  };

  const handleDeleteClass = async (classId: string): Promise<boolean> => {
    try {
      await deleteClassLog(classId);
      toast.success('Class deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete class:', error);
      toast.error('Failed to delete class');
      return false;
    }
  };

  return {
    handleUpdateStatus,
    handleUpdateAttendance,
    handleDeleteClass,
  };
};
