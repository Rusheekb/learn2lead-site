import React from 'react';
import FilterControls from '@/components/shared/FilterControls';
import { Student } from '@/types/sharedTypes';

interface SchedulerFilterProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  subjectFilter: string;
  setSubjectFilter: (value: string) => void;
  studentFilter: string;
  setStudentFilter: (value: string) => void;
  allSubjects: string[];
  students: Student[];
}

const SchedulerFilter: React.FC<SchedulerFilterProps> = ({
  searchTerm,
  setSearchTerm,
  subjectFilter,
  setSubjectFilter,
  studentFilter,
  setStudentFilter,
  allSubjects,
  students,
}) => {
  // Create student options ensuring all have valid values
  const studentOptions = students.map((student) => ({
    value: student.id.toString() || `student-${Date.now()}`,
    label: student.name || `Student ${student.id}`,
  }));

  // Ensure allSubjects doesn't contain empty strings
  const validSubjects = allSubjects.filter(
    (subject) => subject && subject.trim() !== ''
  );

  const clearFilters = () => {
    setSearchTerm('');
    setSubjectFilter('all');
    setStudentFilter('all');
  };

  return (
    <FilterControls
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Search classes..."
      showSubjectFilter={true}
      subjectFilter={subjectFilter}
      setSubjectFilter={setSubjectFilter}
      subjectOptions={validSubjects}
      showStudentFilter={true}
      studentFilter={studentFilter}
      setStudentFilter={setStudentFilter}
      studentOptions={studentOptions}
      clearFilters={clearFilters}
    />
  );
};

export default SchedulerFilter;
