
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
    clearFilters,
    applyFilters
  } = useClassFilters();

  const {
    isDetailsOpen, setIsDetailsOpen,
    selectedClass, setSelectedClass,
    studentUploads, studentMessages,
    activeDetailsTab, setActiveDetailsTab,
    isExporting,
    handleClassClick,
    loadClassContent,
    handleMarkMessageRead,
    handleDownloadFile,
    handleExport,
    getUnreadMessageCount
  } = useClassActions();

  const {
    isLoading,
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

  return {
    // State
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    subjectFilter, setSubjectFilter,
    dateFilter, setDateFilter,
    isDetailsOpen, setIsDetailsOpen,
    selectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab, setActiveDetailsTab,
    isExporting,
    isLoading,
    classes,
    filteredClasses,
    allSubjects,

    // Methods
    handleClassClick,
    formatTime,
    clearFilters,
    handleMarkMessageRead,
    getUnreadMessageCount,
    handleDownloadFile,
    handleExport,
    handleRefreshData
  };
};

export default useClassLogs;
