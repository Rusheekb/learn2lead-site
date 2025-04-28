
import React from 'react';
import SearchInput from '../shared/filters/SearchInput';
import FilterSelect from '../shared/filters/FilterSelect';
import DateFilter from '../shared/filters/DateFilter';
import ToggleSwitch from '../shared/filters/ToggleSwitch';
import ClearFiltersButton from '../shared/filters/ClearFiltersButton';
import { FilterOption } from '../shared/filters/FilterSelect';

export interface FilterControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchPlaceholder?: string;
  
  showStatusFilter?: boolean;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
  statusOptions?: FilterOption[];
  
  showSubjectFilter?: boolean;
  subjectFilter?: string;
  setSubjectFilter?: (subject: string) => void;
  subjectOptions?: FilterOption[] | string[];
  
  showStudentFilter?: boolean;
  studentFilter?: string;
  setStudentFilter?: (student: string) => void;
  studentOptions?: FilterOption[];
  
  showDateFilter?: boolean;
  dateFilter?: Date | undefined;
  setDateFilter?: (date: Date | undefined) => void;
  
  showToggle?: boolean;
  toggleLabel?: string;
  toggleState?: boolean;
  setToggleState?: (state: boolean) => void;
  toggleId?: string;
  
  clearFilters: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  searchTerm,
  setSearchTerm,
  searchPlaceholder = 'Search...',
  
  showStatusFilter = false,
  statusFilter = 'all',
  setStatusFilter,
  statusOptions = [],
  
  showSubjectFilter = false,
  subjectFilter = 'all',
  setSubjectFilter,
  subjectOptions = [],
  
  showStudentFilter = false,
  studentFilter = 'all',
  setStudentFilter,
  studentOptions = [],
  
  showDateFilter = false,
  dateFilter,
  setDateFilter,
  
  showToggle = false,
  toggleLabel = 'Toggle',
  toggleState = false,
  setToggleState,
  toggleId = 'toggle',
  
  clearFilters,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Search Box */}
        <SearchInput
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder={searchPlaceholder}
          className="col-span-4 md:col-span-2"
        />

        {/* Status Filter */}
        {showStatusFilter && setStatusFilter && (
          <FilterSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={statusOptions}
            placeholder="Status"
            allOptionLabel="All Statuses"
          />
        )}

        {/* Subject Filter */}
        {showSubjectFilter && setSubjectFilter && (
          <FilterSelect
            value={subjectFilter}
            onValueChange={setSubjectFilter}
            options={subjectOptions}
            placeholder="Subject"
            allOptionLabel="All Subjects"
          />
        )}

        {/* Student Filter */}
        {showStudentFilter && setStudentFilter && (
          <FilterSelect
            value={studentFilter}
            onValueChange={setStudentFilter}
            options={studentOptions}
            placeholder="Student"
            allOptionLabel="All Students"
          />
        )}

        {/* Date Filter */}
        {showDateFilter && dateFilter !== undefined && setDateFilter && (
          <DateFilter date={dateFilter} setDate={setDateFilter} />
        )}
      </div>

      {/* Toggle and Clear Filters */}
      <div className="flex items-center justify-between">
        {showToggle && setToggleState && (
          <ToggleSwitch
            id={toggleId}
            checked={toggleState}
            onCheckedChange={setToggleState}
            label={toggleLabel}
          />
        )}

        <ClearFiltersButton onClick={clearFilters} className={showToggle ? "ml-auto" : ""} />
      </div>
    </div>
  );
};

export default FilterControls;
