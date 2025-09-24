
import { useEffect, Dispatch, SetStateAction } from 'react';
import useClassFilters from './class-logs/useClassFilters';
import useClassActions from './class-logs/useClassActions';
import useClassData from './class-logs/useClassData';
import useClassRealtime from './class-logs/useClassRealtime';


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
  } = useClassFilters();

  const {
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    setSelectedClass,
    studentUploads,
    studentMessages,
    setStudentMessages, // Ensure this is destructured from useClassActions
    activeDetailsTab,
    setActiveDetailsTab,
    page,
    setPage,
    pageSize,
    setPageSize,
    handleClassClick,
    loadClassContent,
    handleDownloadFile,
    handlePageChange,
    handlePageSizeChange,
  } = useClassActions();

  const {
    isLoading,
    error,
    classes,
    setClasses,
    allSubjects,
    formatTime,
    handleRefreshData,
  } = useClassData();

  

  // Create realtime subscription
  useClassRealtime(
    classes,
    setClasses,
    selectedClass,
    setSelectedClass,
    setIsDetailsOpen as Dispatch<SetStateAction<boolean>>, // Fix the type here
    studentMessages,
    setStudentMessages // Pass the setStudentMessages to the hook
  );

  // Load class content when a class is selected
  useEffect(() => {
    if (selectedClass) {
      loadClassContent(selectedClass.id);
    }
  }, [selectedClass, loadClassContent]);

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
    // State
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
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    studentUploads,
    studentMessages,
    setStudentMessages, // Make sure to include this in the returned object
    activeDetailsTab,
    setActiveDetailsTab,
    
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
    
    
    handleDownloadFile,
    
    handleRefreshData,
    handlePageChange,
    handlePageSizeChange,
  };
};

export default useClassLogs;
