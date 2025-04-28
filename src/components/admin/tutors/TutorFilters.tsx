
import React from 'react';
import FilterControls from '@/components/common/FilterControls';

interface TutorFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  subjectFilter: string;
  setSubjectFilter: (subject: string) => void;
  validSubjects: string[];
}

const TutorFilters: React.FC<TutorFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  subjectFilter,
  setSubjectFilter,
  validSubjects,
}) => {
  const clearFilters = () => {
    setSearchTerm('');
    setSubjectFilter('all');
  };

  return (
    <FilterControls
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Search tutors..."
      showSubjectFilter={true}
      subjectFilter={subjectFilter}
      setSubjectFilter={setSubjectFilter}
      subjectOptions={validSubjects}
      clearFilters={clearFilters}
    />
  );
};

export default TutorFilters;
