
import React from 'react';
import FilterControls from '@/components/common/FilterControls';

export interface ClassFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateFilter: Date | undefined;
  setDateFilter: (date: Date | undefined) => void;
  clearFilters: () => void;
  paymentFilter?: string;
  setPaymentFilter?: (status: string) => void;
}

const ClassFilters: React.FC<ClassFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  clearFilters,
  paymentFilter,
  setPaymentFilter,
}) => {
  // Payment filter options
  const paymentOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
  ];

  return (
    <div className="space-y-4">
      <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchPlaceholder="Search by title, tutor, or student"
        
        showDateFilter={true}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        
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
