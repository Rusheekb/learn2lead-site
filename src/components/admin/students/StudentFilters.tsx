import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import FilterSelect from '@/components/shared/filters/FilterSelect';

interface StudentFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  paymentFilter: string;
  setPaymentFilter: (value: string) => void;
}

const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  paymentFilter,
  setPaymentFilter,
}) => {
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  const paymentOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'overdue', label: 'Overdue' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={handleSearch}
          className="pl-10"
        />
      </div>
      <FilterSelect
        value={statusFilter}
        onValueChange={setStatusFilter}
        options={statusOptions}
        placeholder="Filter by status"
        allOptionLabel="All Status"
        className="w-[180px]"
      />
      <FilterSelect
        value={paymentFilter}
        onValueChange={setPaymentFilter}
        options={paymentOptions}
        placeholder="Filter by payment"
        allOptionLabel="All Payments"
        className="w-[180px]"
      />
    </div>
  );
};

export default StudentFilters;
