import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Upload, DollarSign } from 'lucide-react';
import { exportClassLogsToCSV } from '@/utils/csvExport';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import ClassFilters from './class-logs/ClassFilters';
import ClassTable from './class-logs/ClassTable';
import ClassDetailsDialog from './class-logs/ClassDetailsDialog';
import CsvUploader from './class-logs/CsvUploader';
import { ExportDialog } from './class-logs/ExportDialog';
import TutorPaymentSummary from './class-logs/TutorPaymentSummary';
import StudentPaymentRecorder from './class-logs/StudentPaymentRecorder';
import { useClassLogs } from '@/hooks/useClassLogs';
import { logger } from '@/lib/logger';

const log = logger.create('ClassLogs');

const ClassLogs: React.FC = () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
  const {
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    paymentFilter,
    setPaymentFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab,
    setActiveDetailsTab,
    
    isLoading,
    error,
    paginatedClasses,
    page,
    pageSize,
    totalPages,
    totalItems,
    totals,
    exportData,
    fetchExportData,
    isExportLoading,
    handleClassClick,
    formatTime,
    clearFilters,
    handleDownloadFile,
    
    handleRefreshData,
    handlePageChange,
    handlePageSizeChange,

    studentPaymentMethods,
    handleToggleStudentPayment,
    handleToggleTutorPayment,
  } = useClassLogs();

  const handleExportCSV = async (startDate?: Date, endDate?: Date) => {
    try {
      // Fetch all matching data on demand
      const result = await fetchExportData();
      const data = result.data || [];
      exportClassLogsToCSV(data, startDate, endDate);
      if (startDate && endDate) {
        toast.success(`Exported ${data.length} class logs from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      } else {
        toast.success(`Exported ${data.length} class logs`);
      }
    } catch (error) {
      log.error('Error exporting CSV:', error);
      toast.error('Failed to export class logs');
    }
  };

  const selectedStudentMethod = selectedClass?.studentName
    ? studentPaymentMethods[selectedClass.studentName] || 'zelle'
    : 'zelle';

  const profit = totals.totalClassCost - totals.totalTutorCost;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Class Logs & Payments</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsPaymentOpen(true)}
            className="flex items-center gap-2"
          >
            <DollarSign className="h-4 w-4" />
            <span className="hidden xs:inline">Record</span> Payment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2"
            disabled={totals.totalCount === 0}
          >
            <FileDown className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">${totals.totalClassCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Tutor Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">${totals.totalTutorCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">${profit.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pending (Students)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-destructive truncate">${totals.pendingStudent.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pending (Tutors)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-destructive truncate">${totals.pendingTutor.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tutor Payment Summary */}
      <TutorPaymentSummary
        onPaymentUpdated={handleRefreshData}
      />

      <ClassFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter || undefined}
        setDateFilter={(date) => setDateFilter(date || null)}
        clearFilters={clearFilters}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
      />

      <ClassTable
        paginatedClasses={paginatedClasses}
        isLoading={isLoading}
        error={error ? (error instanceof Error ? error.message : String(error)) : null}
        handleClassClick={handleClassClick}
        clearFilters={handleRefreshData}
        formatTime={formatTime}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={totalItems}
        totalFiltered={totals.totalCount}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        studentPaymentMethods={studentPaymentMethods}
        onToggleStudentPayment={handleToggleStudentPayment}
        onToggleTutorPayment={handleToggleTutorPayment}
      />

      <ClassDetailsDialog
        isDetailsOpen={isDetailsOpen}
        setIsDetailsOpen={setIsDetailsOpen}
        selectedClass={selectedClass}
        activeDetailsTab={activeDetailsTab}
        setActiveDetailsTab={setActiveDetailsTab}
        studentUploads={studentUploads}
        studentMessages={studentMessages}
        handleDownloadFile={async () => {}}
        formatTime={formatTime}
        studentPaymentMethod={selectedStudentMethod}
        onToggleStudentPayment={handleToggleStudentPayment}
        onToggleTutorPayment={handleToggleTutorPayment}
        onCostsUpdated={handleRefreshData}
      />

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Class Logs</DialogTitle>
          </DialogHeader>
          <CsvUploader
            onUploadComplete={() => {
              setIsUploadOpen(false);
              handleRefreshData();
            }}
          />
        </DialogContent>
      </Dialog>

      <ExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        onExport={handleExportCSV}
        totalRecords={totals.totalCount}
        isLoading={isExportLoading}
      />

      <StudentPaymentRecorder
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        onPaymentRecorded={handleRefreshData}
      />
    </div>
  );
};

export default ClassLogs;
