
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClassLogs } from '@/hooks/useClassLogs';
import { usePaymentManager } from './payments/usePaymentManager';
import PaymentSummaryCards from './payments/PaymentSummaryCards';
import PaymentFilters from './payments/PaymentFilters';
import PaymentTable from './payments/PaymentTable';
import PaymentActions from './payments/PaymentActions';
import PaymentSummarySkeleton from './payments/PaymentSummarySkeleton';

const PaymentsManager: React.FC = () => {
  const { classes } = useClassLogs();
  
  const {
    currentItems,
    isLoading,
    searchTerm,
    statusFilter,
    currentPage,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    handleSearch,
    handleStatusFilter,
    handleRefresh,
    handleExport,
    handlePageChange,
    handleNextPage,
    handlePrevPage,
    formatDate,
    calculateTotals,
  } = usePaymentManager(classes);

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Management</h2>
        <PaymentActions 
          onRefresh={handleRefresh} 
          onExport={handleExport} 
          isLoading={isLoading}
        />
      </div>

      {isLoading ? (
        <PaymentSummarySkeleton />
      ) : (
        <PaymentSummaryCards totals={totals} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <PaymentFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilter}
          />
        </CardHeader>
        <CardContent>
          <PaymentTable
            payments={currentItems}
            currentPage={currentPage}
            totalPages={totalPages}
            indexOfFirstItem={indexOfFirstItem}
            indexOfLastItem={indexOfLastItem}
            onPageChange={handlePageChange}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            isLoading={isLoading}
            formatDate={formatDate}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsManager;
