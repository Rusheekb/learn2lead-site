
import { useClassFiltering } from './hooks/useClassFiltering';
import { useClassState } from './hooks/useClassState';
import { useClassData } from './hooks/useClassData';
import { useClassActions } from './hooks/useClassActions';
import { usePagination } from './hooks/usePagination';

export const useClassLogs = () => {
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    subjectFilter,
    setSubjectFilter,
    dateFilter,
    setDateFilter,
    showCodeLogs,
    setShowCodeLogs,
    clearFilters,
    applyFilters,
  } = useClassFiltering();

  const {
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    setSelectedClass,
    studentUploads,
    setStudentUploads,
    studentMessages,
    setStudentMessages,
    activeDetailsTab,
    setActiveDetailsTab,
    isExporting,
    setIsExporting,
  } = useClassState();

  const { isLoading, error, classes, setClasses, handleRefreshData } = useClassData();

  const {
    handleMarkMessageRead,
    handleDownloadFile,
    handleExport,
    getUnreadMessageCount,
  } = useClassActions(setStudentMessages, studentMessages, studentUploads, setIsExporting);

  const {
    page,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination();

  // Apply filters to classes
  const filteredClasses = applyFilters(classes);

  // Calculate pagination values
  const totalItems = filteredClasses.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedClasses = filteredClasses.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return {
    // Filter state
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    subjectFilter,
    setSubjectFilter,
    dateFilter,
    setDateFilter,
    showCodeLogs,
    setShowCodeLogs,
    
    // UI state
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    setSelectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab,
    setActiveDetailsTab,
    isExporting,
    
    // Data state
    isLoading,
    error,
    classes,
    filteredClasses,
    paginatedClasses,
    
    // Pagination
    page,
    pageSize,
    totalPages,
    totalItems,
    
    // Actions
    clearFilters,
    handleMarkMessageRead,
    getUnreadMessageCount,
    handleDownloadFile,
    handleExport,
    handleRefreshData,
    handlePageChange,
    handlePageSizeChange,
  };
};

export default useClassLogs;
