
import React from "react";
import FilterControls from "@/components/shared/FilterControls";
import { Student } from "@/types/sharedTypes";

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
  const studentOptions = students.map(student => ({
    value: student.id.toString(),
    label: student.name
  }));

  const clearFilters = () => {
    setSearchTerm("");
    setSubjectFilter("all");
    setStudentFilter("all");
  };

  return (
    <FilterControls
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Search classes..."
      showSubjectFilter={true}
      subjectFilter={subjectFilter}
      setSubjectFilter={setSubjectFilter}
      subjectOptions={allSubjects}
      showStudentFilter={true}
      studentFilter={studentFilter}
      setStudentFilter={setStudentFilter}
      studentOptions={studentOptions}
      clearFilters={clearFilters}
    />
  );
};

export default SchedulerFilter;
