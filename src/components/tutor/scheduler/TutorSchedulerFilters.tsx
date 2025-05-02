
import React from 'react';
import SchedulerFilter from '../SchedulerFilter';
import { mockStudents } from '../mock-data-students';

interface TutorSchedulerFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  subjectFilter: string;
  setSubjectFilter: (value: string) => void;
  studentFilter: string;
  setStudentFilter: (value: string) => void;
  allSubjects: string[];
}

const TutorSchedulerFilters: React.FC<TutorSchedulerFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  subjectFilter,
  setSubjectFilter,
  studentFilter,
  setStudentFilter,
  allSubjects,
}) => {
  return (
    <SchedulerFilter
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      subjectFilter={subjectFilter}
      setSubjectFilter={setSubjectFilter}
      studentFilter={studentFilter}
      setStudentFilter={setStudentFilter}
      allSubjects={allSubjects}
      students={mockStudents}
    />
  );
};

export default TutorSchedulerFilters;
