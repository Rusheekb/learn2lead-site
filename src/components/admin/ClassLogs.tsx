import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, RefreshCw, Upload } from 'lucide-react';
import { exportClassLogsToCSV } from '@/utils/csvExport';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Import refactored components
import ClassFilters from './class-logs/ClassFilters';
import ClassTable from './class-logs/ClassTable';
import ClassDetailsDialog from './class-logs/ClassDetailsDialog';
import CsvUploader from './class-logs/CsvUploader';
import { ExportDialog } from './class-logs/ExportDialog';
import { useClassLogs } from '@/hooks/useClassLogs';
import { ExportFormat } from '@/types/classTypes';

const ClassLogs: React.FC = () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const {
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab,
    setActiveDetailsTab,
    
    isLoading,
    error,
    classes,
    filteredClasses,
    paginatedClasses,
    page,
    pageSize,
    totalPages,
    totalItems,
    handleClassClick,
    formatTime,
    clearFilters,
    handleDownloadFile,
    
    handleRefreshData,
    handlePageChange,
    handlePageSizeChange,
  } = useClassLogs();


  // Calculate payment totals from filtered classes
  const paymentTotals = useMemo(() => {
    return filteredClasses.reduce(
      (totals, cls) => {
        const classCost = cls.classCost || 0;
        const tutorCost = cls.tutorCost || 0;
        const isPaid = cls.studentPayment?.toLowerCase() === 'paid';
        
        return {
          classCost: totals.classCost + classCost,
          tutorCost: totals.tutorCost + tutorCost,
          profit: totals.profit + (classCost - tutorCost),
          pending: totals.pending + (isPaid ? 0 : classCost),
        };
      },
      { classCost: 0, tutorCost: 0, profit: 0, pending: 0 }
    );
  }, [filteredClasses]);

  const handleExportCSV = (startDate?: Date, endDate?: Date) => {
    try {
      exportClassLogsToCSV(filteredClasses, startDate, endDate);
      
      if (startDate && endDate) {
        toast.success(`Exported ${filteredClasses.length} class logs from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      } else {
        toast.success(`Exported ${filteredClasses.length} class logs`);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export class logs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Class Logs & Payments</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2"
            disabled={filteredClasses.length === 0}
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${paymentTotals.classCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tutor Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${paymentTotals.tutorCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${paymentTotals.profit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${paymentTotals.pending.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <ClassFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter || undefined}
        setDateFilter={(date) => setDateFilter(date || null)}
        clearFilters={clearFilters}
      />

      <ClassTable
        classes={classes}
        filteredClasses={filteredClasses}
        paginatedClasses={paginatedClasses}
        isLoading={isLoading}
        error={error}
        handleClassClick={handleClassClick}
        clearFilters={handleRefreshData}
        formatTime={formatTime}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
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
        totalRecords={filteredClasses.length}
      />
    </div>
  );
};

export default ClassLogs;
