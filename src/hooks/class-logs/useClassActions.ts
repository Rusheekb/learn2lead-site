
import { useState } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import { useClassHandling } from './hooks/useClassHandling';
import { useMessageActions } from './hooks/useMessageActions';
import { useFileActions } from './hooks/useFileActions';
import { useExportActions } from './hooks/useExportActions';
import { usePaginationHandling } from './hooks/usePaginationHandling';

const useClassActions = () => {
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<ClassEvent | null>(null);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>('details');

  const { handleMarkMessageRead, getUnreadMessageCount } = useMessageActions(
    setStudentMessages,
    studentMessages
  );
  const { handleDownloadFile } = useFileActions(studentUploads);
  const { handleExport, isExporting } = useExportActions();
  const {
    handleClassClick: baseHandleClassClick,
    loadClassContent: baseLoadClassContent,
    handleUpdateStatus,
    handleUpdateAttendance,
    handleDeleteClass,
  } = useClassHandling();
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    handlePageChange,
    handlePageSizeChange,
  } = usePaginationHandling();

  const handleClassClick = (cls: ClassEvent) => {
    baseHandleClassClick(
      cls,
      setSelectedClass,
      setIsDetailsOpen,
      setActiveDetailsTab,
      (classId) => baseLoadClassContent(classId, setStudentUploads, setStudentMessages)
    );
  };

  const loadClassContent = (classId: string) => {
    return baseLoadClassContent(classId, setStudentUploads, setStudentMessages);
  };

  return {
    // State
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    setSelectedClass,
    studentUploads,
    studentMessages,
    setStudentMessages, // Make sure to include this in the returned object
    activeDetailsTab,
    setActiveDetailsTab,
    isExporting,
    page,
    setPage,
    pageSize,
    setPageSize,

    // Actions
    handleClassClick,
    loadClassContent,
    handleMarkMessageRead,
    handleDownloadFile,
    handleUpdateStatus,
    handleUpdateAttendance,
    handleDeleteClass,
    handleExport,
    getUnreadMessageCount,
    handlePageChange,
    handlePageSizeChange,
  };
};

export default useClassActions;
