import { useEffect } from "react";
import useClassFilters from "./class-logs/useClassFilters";
import useClassActions from "./class-logs/useClassActions";
import useClassData from "./class-logs/useClassData";
import useClassRealtime from "./class-logs/useClassRealtime";

export const useClassLogs = () => {
  const {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    subjectFilter, setSubjectFilter,
    dateFilter, setDateFilter,
    showCodeLogs, setShowCodeLogs,
    clearFilters,
    applyFilters
  } = useClassFilters();

  const {
    isDetailsOpen, setIsDetailsOpen,
    selectedClass, setSelectedClass,
    studentUploads, studentMessages,
    activeDetailsTab, setActiveDetailsTab,
    isExporting,
    page, setPage,
    pageSize, setPageSize,
    handleClassClick,
    loadClassContent,
    handleMarkMessageRead,
    handleDownloadFile,
    handleExport,
    getUnreadMessageCount,
    handlePageChange,
    handlePageSizeChange
  } = useClassActions();

  const {
    isLoading,
    error,
    classes, setClasses,
    allSubjects,
    formatTime,
    handleRefreshData
  } = useClassData();

  // Create realtime subscription
  useClassRealtime(classes, setClasses, selectedClass, setSelectedClass, setIsDetailsOpen);

  // Load class content when a class is selected
  useEffect(() => {
    if (selectedClass) {
      loadClassContent(selectedClass.id);
    }
  }, [selectedClass]);

  // Apply filters to classes
  const filteredClasses = applyFilters(classes);
  
  // Calculate pagination values
  const totalItems = filteredClasses.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize);

  return {
    // State
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    subjectFilter, setSubjectFilter,
    dateFilter, setDateFilter,
    showCodeLogs, setShowCodeLogs,
    isDetailsOpen, setIsDetailsOpen,
    selectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab, setActiveDetailsTab,
    isExporting,
    isLoading,
    error,
    classes,
    filteredClasses,
    paginatedClasses,
    allSubjects,
    page, 
    pageSize,
    totalPages,
    totalItems,

    // Methods
    handleClassClick,
    formatTime,
    clearFilters,
    handleMarkMessageRead,
    getUnreadMessageCount,
    handleDownloadFile,
    handleExport,
    handleRefreshData,
    handlePageChange,
    handlePageSizeChange
  };
};

export default useClassLogs;
