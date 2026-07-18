import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileDown,
  Upload,
  DollarSign,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { exportClassLogsToCSV } from '@/utils/csvExport';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

import ClassFilters from './class-logs/ClassFilters';
import ClassTable from './class-logs/ClassTable';
import ClassDetailsDialog from './class-logs/ClassDetailsDialog';
import CsvUploader from './class-logs/CsvUploader';
import { ExportDialog } from './class-logs/ExportDialog';
import TutorPaymentSummary from './class-logs/TutorPaymentSummary';
import StudentPaymentSummary from './class-logs/StudentPaymentSummary';
import StudentPaymentRecorder from './class-logs/StudentPaymentRecorder';
import { useClassLogs } from '@/hooks/useClassLogs';
import { cn, getErrorMessage } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface CancellationRow {
  id: string;
  scheduled_class_id: string;
  title: string | null;
  subject: string | null;
  class_date: string | null;
  class_start: string | null;
  cancelled_at: string;
  student: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  tutor: { first_name: string | null; last_name: string | null } | null;
}

const RecentCancellations: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: cancellations = [], isLoading } = useQuery<CancellationRow[]>({
    queryKey: ['class-cancellations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_cancellations')
        .select(
          'id, scheduled_class_id, title, subject, class_date, class_start, cancelled_at, student:profiles!student_id(first_name,last_name,email), tutor:profiles!tutor_id(first_name,last_name)'
        )
        .order('cancelled_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown as CancellationRow[]) || [];
    },
    staleTime: 60_000,
    enabled: isExpanded,
  });

  if (cancellations.length === 0 && !isLoading && !isExpanded) return null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setIsExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">Recent Cancellations</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && (
        <div className="border-t divide-y divide-border/50">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : cancellations.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No cancellations recorded.
            </div>
          ) : (
            cancellations.map((c) => {
              const student = c.student as any;
              const tutor = c.tutor as any;
              const studentName = student
                ? [student.first_name, student.last_name]
                    .filter(Boolean)
                    .join(' ') || student.email
                : '—';
              const tutorName = tutor
                ? [tutor.first_name, tutor.last_name]
                    .filter(Boolean)
                    .join(' ') || '—'
                : '—';
              return (
                <div
                  key={c.id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.subject && (
                        <Badge variant="outline" className="text-xs">
                          {c.subject}
                        </Badge>
                      )}
                      <span className="text-sm font-medium truncate">
                        {c.title || 'Untitled'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {studentName} · {tutorName}
                      {c.class_date &&
                        ` · ${format(parseISO(c.class_date), 'MMM d, yyyy')}`}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    Cancelled{' '}
                    {format(parseISO(c.cancelled_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const log = logger.create('ClassLogs');

const ClassLogs: React.FC = () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [initialPaymentStudent, setInitialPaymentStudent] = useState<
    string | undefined
  >();

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
        toast.success(
          `Exported ${data.length} class logs from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
        );
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
            onClick={() => {
              setInitialPaymentStudent(undefined);
              setIsPaymentOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Add Credits
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
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">
              ${totals.totalClassCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Tutor Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">
              ${totals.totalTutorCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">
              ${profit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pending (Tutors)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div
              className={cn(
                'text-lg sm:text-2xl font-bold truncate',
                totals.pendingTutor > 0 ? 'text-destructive' : ''
              )}
            >
              ${totals.pendingTutor.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Summaries */}
      <TutorPaymentSummary onPaymentUpdated={handleRefreshData} />
      <StudentPaymentSummary
        onAddCredits={(studentName) => {
          setInitialPaymentStudent(studentName);
          setIsPaymentOpen(true);
        }}
      />

      <RecentCancellations />

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
        error={error ? getErrorMessage(error) : null}
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
        onOpenChange={(open) => {
          setIsPaymentOpen(open);
          if (!open) setInitialPaymentStudent(undefined);
        }}
        onPaymentRecorded={handleRefreshData}
        initialStudentName={initialPaymentStudent}
      />
    </div>
  );
};

export default ClassLogs;
