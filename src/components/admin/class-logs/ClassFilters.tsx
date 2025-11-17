
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
  paymentFilter?: string;
  setPaymentFilter?: (status: string) => void;
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
  paymentFilter,
  setPaymentFilter,
}) => {
  // Common status options with guaranteed non-empty values
  const statusOptions = [
    { value: 'completed', label: 'Completed' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Payment filter options
  const paymentOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
  ];

  // Filter out empty subjects and ensure all have valid values
  const validSubjects = allSubjects.filter(
    (subject) => subject && subject.trim() !== ''
  );

  return (
    <div className="space-y-4">
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
      
      {/* Additional payment filter */}
      {paymentFilter !== undefined && setPaymentFilter && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Payment Status:</label>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Payments</option>
            {paymentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default ClassFilters;
