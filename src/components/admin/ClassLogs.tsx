import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Upload, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
import { useClassLogs } from '@/hooks/useClassLogs';

const ClassLogs: React.FC = () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
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

    studentPaymentMethods,
    handleToggleStudentPayment,
    handleToggleTutorPayment,
  } = useClassLogs();

  // Calculate payment totals from filtered classes
  const paymentTotals = useMemo(() => {
    return filteredClasses.reduce(
      (totals, cls) => {
        const classCost = cls.classCost || 0;
        const tutorCost = cls.tutorCost || 0;
        
        return {
          classCost: totals.classCost + classCost,
          tutorCost: totals.tutorCost + tutorCost,
          profit: totals.profit + (classCost - tutorCost),
          pendingStudent: totals.pendingStudent + (cls.studentPaymentDate ? 0 : classCost),
          pendingTutor: totals.pendingTutor + (cls.tutorPaymentDate ? 0 : tutorCost),
        };
      },
      { classCost: 0, tutorCost: 0, profit: 0, pendingStudent: 0, pendingTutor: 0 }
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

  const selectedStudentMethod = selectedClass?.studentName
    ? studentPaymentMethods[selectedClass.studentName] || 'zelle'
    : 'zelle';

  const handleApplyDefaultRates = async () => {
    setIsBackfilling(true);
    try {
      // Fetch all students with class_rate
      const { data: students } = await supabase
        .from('students')
        .select('name, class_rate')
        .not('class_rate', 'is', null);

      // Fetch all tutors with hourly_rate
      const { data: tutors } = await supabase
        .from('tutors')
        .select('name, hourly_rate')
        .not('hourly_rate', 'is', null);

      let updatedCount = 0;

      // Update class costs from student rates
      if (students && students.length > 0) {
        for (const student of students) {
          const { data } = await supabase
            .from('class_logs')
            .update({ 'Class Cost': student.class_rate } as any)
            .eq('Student Name', student.name)
            .is('Class Cost', null)
            .select('id');
          updatedCount += data?.length || 0;
        }
      }

      // Update tutor costs from tutor rates
      if (tutors && tutors.length > 0) {
        for (const tutor of tutors) {
          const { data } = await supabase
            .from('class_logs')
            .update({ 'Tutor Cost': tutor.hourly_rate } as any)
            .eq('Tutor Name', tutor.name)
            .is('Tutor Cost', null)
            .select('id');
          updatedCount += data?.length || 0;
        }
      }

      toast.success(`Applied default rates to ${updatedCount} class log fields`);
      handleRefreshData();
    } catch (error) {
      console.error('Error applying default rates:', error);
      toast.error('Failed to apply default rates');
    } finally {
      setIsBackfilling(false);
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
            onClick={handleApplyDefaultRates}
            disabled={isBackfilling}
            className="flex items-center gap-2"
          >
            <Wand2 className="h-4 w-4" />
            {isBackfilling ? 'Applying...' : 'Apply Default Rates'}
          </Button>
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
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paymentTotals.classCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tutor Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paymentTotals.tutorCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paymentTotals.profit.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending (Students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${paymentTotals.pendingStudent.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending (Tutors)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${paymentTotals.pendingTutor.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tutor Payment Summary */}
      <TutorPaymentSummary
        classes={classes}
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
