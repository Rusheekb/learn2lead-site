
import React from "react";
import FilterControls from "@/components/shared/FilterControls";

export interface ClassFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  subjectFilter: string;
  setSubjectFilter: (subject: string) => void;
  dateFilter: Date | undefined;
  setDateFilter: (date: Date | undefined) => void;
  clearFilters: () => void;
  allSubjects: string[];
  showCodeLogs: boolean;
  setShowCodeLogs: (show: boolean) => void;
}

const ClassFilters: React.FC<ClassFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  subjectFilter,
  setSubjectFilter,
  dateFilter,
  setDateFilter,
  clearFilters,
  allSubjects,
  showCodeLogs,
  setShowCodeLogs
}) => {
  // Common status options
  const statusOptions = [
    { value: "completed", label: "Completed" },
    { value: "upcoming", label: "Upcoming" },
    { value: "cancelled", label: "Cancelled" }
  ];

  return (
    <FilterControls
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Search by title, tutor, or student"
      showStatusFilter={true}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      statusOptions={statusOptions}
      showSubjectFilter={true}
      subjectFilter={subjectFilter}
      setSubjectFilter={setSubjectFilter}
      subjectOptions={allSubjects}
      showDateFilter={true}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      showCodeLogsSwitch={true}
      showCodeLogs={showCodeLogs}
      setShowCodeLogs={setShowCodeLogs}
      clearFilters={clearFilters}
    />
  );
};

export default ClassFilters;
