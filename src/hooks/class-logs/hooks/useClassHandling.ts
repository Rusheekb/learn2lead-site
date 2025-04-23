
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteClassLog, updateClassLog } from '@/services/classLogsService';
import { ClassEvent } from '@/types/tutorTypes';
import { fetchClassMessages, fetchClassUploads } from '@/services/classMessagesService';

export const useClassHandling = () => {
  const handleClassClick = async (cls: ClassEvent, 
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

  const handleUpdateStatus = async (
    classId: string,
    status: string
  ): Promise<boolean> => {
    try {
      await updateClassLog(classId, { status });
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
      await updateClassLog(classId, { attendance });
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
    handleClassClick,
    loadClassContent,
    handleUpdateStatus,
    handleUpdateAttendance,
    handleDeleteClass,
  };
};
