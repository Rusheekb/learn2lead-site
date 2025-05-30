
import React from 'react';
import FilterControls from '@/components/common/FilterControls';

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
  setShowCodeLogs,
}) => {
  // Common status options with guaranteed non-empty values
  const statusOptions = [
    { value: 'completed', label: 'Completed' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Filter out empty subjects and ensure all have valid values
  const validSubjects = allSubjects.filter(
    (subject) => subject && subject.trim() !== ''
  );

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
      subjectOptions={validSubjects}
      
      showDateFilter={true}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      
      showToggle={true}
      toggleLabel="Show code logs"
      toggleState={showCodeLogs}
      setToggleState={setShowCodeLogs}
      toggleId="code-logs"
      
      clearFilters={clearFilters}
    />
  );
};

export default ClassFilters;
