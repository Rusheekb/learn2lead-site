
import React from 'react';
import FilterControls from '@/components/common/FilterControls';

interface StudentFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchTerm,
  setSearchTerm,
}) => {
  const clearFilters = () => {
    setSearchTerm('');
  };

  return (
    <div className="mt-4">
      <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchPlaceholder="Search students..."
        showStatusFilter={false}
        clearFilters={clearFilters}
      />
    </div>
  );
};

export default StudentFilters;
