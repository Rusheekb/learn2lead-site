import React from 'react';
import SearchInput from './filters/SearchInput';
import FilterSelect, { FilterOption } from './filters/FilterSelect';
import DateFilter from './filters/DateFilter';
import ToggleSwitch from './filters/ToggleSwitch';
import ClearFiltersButton from './filters/ClearFiltersButton';

export interface CommonFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchPlaceholder?: string;
  showDateFilter?: boolean;
  dateFilter?: Date;
  setDateFilter?: (date: Date | undefined) => void;
  showSubjectFilter?: boolean;
  subjectFilter?: string;
  setSubjectFilter?: (subject: string) => void;
  subjectOptions?: FilterOption[] | string[];
  showStatusFilter?: boolean;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
  statusOptions?: FilterOption[];
  showStudentFilter?: boolean;
  studentFilter?: string;
  setStudentFilter?: (student: string) => void;
  studentOptions?: FilterOption[];
  showCodeLogsSwitch?: boolean;
  showCodeLogs?: boolean;
  setShowCodeLogs?: (show: boolean) => void;
  clearFilters: () => void;
}

const FilterControls: React.FC<CommonFilterProps> = ({
  searchTerm,
  setSearchTerm,
  searchPlaceholder = 'Search...',
  showDateFilter = false,
  dateFilter,
  setDateFilter,
  showSubjectFilter = false,
  subjectFilter = 'all',
  setSubjectFilter,
  subjectOptions = [],
  showStatusFilter = false,
  statusFilter = 'all',
  setStatusFilter,
  statusOptions = [],
  showStudentFilter = false,
  studentFilter = 'all',
  setStudentFilter,
  studentOptions = [],
  showCodeLogsSwitch = false,
  showCodeLogs = false,
  setShowCodeLogs,
  clearFilters,
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Search Box */}
      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        placeholder={searchPlaceholder}
        className={`${showDateFilter || showStatusFilter || showSubjectFilter ? 'col-span-4 md:col-span-2' : 'col-span-4'}`}
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

      {/* Code Logs Switch and Clear Filters */}
      <div className="flex items-center justify-between col-span-4">
        {showCodeLogsSwitch && setShowCodeLogs && (
          <ToggleSwitch
            id="code-logs"
            checked={showCodeLogs}
            onCheckedChange={setShowCodeLogs}
            label="Show code logs"
          />
        )}

        <ClearFiltersButton onClick={clearFilters} className="ml-auto" />
      </div>
    </div>
  );
};

export default FilterControls;
