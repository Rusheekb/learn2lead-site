
import React from 'react';
import FilterControls from '@/components/shared/FilterControls';

export interface ClassFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateFilter: Date | undefined;
  setDateFilter: (date: Date | undefined) => void;
  clearFilters: () => void;
  paymentFilter?: string;
  setPaymentFilter?: (status: string) => void;
  paymentMethodFilter?: string;
  setPaymentMethodFilter?: (method: string) => void;
}

const ClassFilters: React.FC<ClassFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  clearFilters,
  paymentFilter,
  setPaymentFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
}) => {
  // Payment filter options
  const paymentOptions = [
    { value: 'student_unpaid', label: 'Student: Unpaid' },
    { value: 'tutor_unpaid', label: 'Tutor: Unpaid' },
    { value: 'student_paid', label: 'Student: Paid' },
    { value: 'tutor_paid', label: 'Tutor: Paid' },
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
      
      {/* Payment status and method filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {paymentFilter !== undefined && setPaymentFilter && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Payment Status:</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="">All</option>
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {paymentMethodFilter !== undefined && setPaymentMethodFilter && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Method:</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="">All Methods</option>
              <option value="stripe">Stripe</option>
              <option value="zelle">Zelle</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassFilters;
