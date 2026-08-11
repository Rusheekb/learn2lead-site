import React, { memo, useState, useEffect, useMemo } from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ActionButton } from '@/components/common/ActionButton';
import { ClassEvent } from '@/types/tutorTypes';
import { formatTimeRange } from '@/utils/dateTimeUtils';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type BulkAction =
  | 'mark-tutor-paid'
  | 'mark-tutor-unpaid'
  | 'mark-student-paid'
  | 'mark-student-unpaid';

const BULK_ACTION_LABELS: Record<BulkAction, string> = {
  'mark-tutor-paid': 'Mark Tutor Paid',
  'mark-tutor-unpaid': 'Mark Tutor Unpaid',
  'mark-student-paid': 'Mark Student Paid',
  'mark-student-unpaid': 'Mark Student Unpaid',
};

interface ClassTableProps {
  paginatedClasses: ClassEvent[];
  isLoading: boolean;
  error?: string | null;
  handleClassClick: (cls: ClassEvent) => void;
  clearFilters: () => void;
  formatTime: (time: string) => string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  totalFiltered: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  studentPaymentMethods?: Record<string, string>;
  onToggleStudentPayment?: (classId: string, currentlyPaid: boolean) => void;
  onToggleTutorPayment?: (classId: string, currentlyPaid: boolean) => void;
  onBulkAction?: (action: BulkAction, classIds: string[]) => Promise<void>;
}

const formatDate = (date: Date | string) => {
  try {
    if (!date) return 'Date not available';
    const dateObj = parseDateToLocal(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return format(dateObj, 'MMM d, yyyy');
  } catch {
    return String(date);
  }
};

const ClassTable: React.FC<ClassTableProps> = memo(
  ({
    paginatedClasses,
    isLoading,
    error,
    handleClassClick,
    clearFilters,
    formatTime,
    page,
    pageSize,
    totalPages,
    totalItems,
    totalFiltered,
    onPageChange,
    onPageSizeChange,
    onToggleTutorPayment,
    onBulkAction,
  }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    // Clear selection whenever the visible page changes
    useEffect(() => {
      setSelectedIds(new Set());
    }, [page, pageSize]);

    const pageIds = useMemo(
      () => paginatedClasses.map((c) => c.id),
      [paginatedClasses]
    );
    const allSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const someSelected = selectedIds.size > 0 && !allSelected;

    const toggleAll = () =>
      setSelectedIds(allSelected ? new Set() : new Set(pageIds));
    const toggleOne = (id: string) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });

    const handleConfirmBulk = async () => {
      if (!confirmAction || !onBulkAction) return;
      setIsBusy(true);
      await onBulkAction(confirmAction, Array.from(selectedIds));
      setIsBusy(false);
      setConfirmAction(null);
      setSelectedIds(new Set());
    };

    const columns: ColumnDefinition<ClassEvent>[] = useMemo(
      () => [
        {
          header: (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={
                  allSelected || (someSelected ? 'indeterminate' : false)
                }
                onCheckedChange={toggleAll}
                aria-label="Select all on page"
              />
            </div>
          ),
          className: 'w-10',
          cell: (cls) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedIds.has(cls.id)}
                onCheckedChange={() => toggleOne(cls.id)}
                aria-label={`Select ${cls.title || cls.subject}`}
              />
            </div>
          ),
        },
        {
          header: 'Class Details',
          cell: (cls) => (
            <div className="space-y-1">
              <div className="font-medium text-sm flex items-center gap-1.5">
                {cls.title || cls.subject}
                {cls.disputed && (
                  <Badge
                    variant="destructive"
                    className="text-xs gap-1 shrink-0"
                  >
                    <Flag className="h-3 w-3" />
                    Reported
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                <div>Tutor: {cls.tutorName}</div>
                <div>Student: {cls.studentName}</div>
              </div>
              <div className="text-xs text-muted-foreground sm:hidden">
                {formatDate(cls.date)}
              </div>
            </div>
          ),
        },
        {
          header: 'Date & Time',
          className: 'hidden sm:table-cell',
          cell: (cls) => (
            <div className="space-y-1">
              <div>{formatDate(cls.date)}</div>
              <div className="text-sm text-muted-foreground">
                {formatTimeRange(cls.startTime, cls.endTime)}
              </div>
            </div>
          ),
        },
        {
          header: 'Payments',
          className: 'hidden md:table-cell',
          cell: (cls) => (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Class:</span>
                <span className="font-medium">
                  ${cls.classCost?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Tutor:</span>
                <span className="font-medium">
                  ${cls.tutorCost?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          ),
        },
        {
          header: 'Tutor Pay',
          cell: (cls) => {
            const tutorPaid = !!cls.tutorIsPaid;
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={`w-2.5 h-2.5 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all ${tutorPaid ? 'bg-emerald-500' : 'bg-destructive'}`}
                        title={tutorPaid ? 'Tutor: Paid' : 'Tutor: Unpaid'}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" side="left">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {tutorPaid
                            ? 'Mark tutor payment as unpaid?'
                            : 'Mark tutor payment as paid today?'}
                        </p>
                        <Button
                          size="sm"
                          variant={tutorPaid ? 'outline' : 'default'}
                          onClick={() =>
                            onToggleTutorPayment?.(cls.id, tutorPaid)
                          }
                          className="w-full"
                        >
                          {tutorPaid ? 'Mark Unpaid' : 'Mark Paid'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {tutorPaid && cls.tutorPaymentDate && (
                    <span className="text-xs font-medium hidden lg:inline">
                      {format(cls.tutorPaymentDate, 'M/d/yy')}
                    </span>
                  )}
                </div>
              </div>
            );
          },
        },
        {
          header: 'Actions',
          className: 'hidden sm:table-cell',
          cell: () => (
            <ActionButton
              variant="ghost"
              size="sm"
              tooltip="View class details"
            >
              View
            </ActionButton>
          ),
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [selectedIds, allSelected, someSelected, onToggleTutorPayment]
    );

    return (
      <>
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
            <span className="text-sm font-medium">
              {selectedIds.size} row{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => setConfirmAction('mark-tutor-paid')}
                disabled={!onBulkAction}
              >
                Mark Tutor Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction('mark-tutor-unpaid')}
                disabled={!onBulkAction}
              >
                Mark Tutor Unpaid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction('mark-student-paid')}
                disabled={!onBulkAction}
              >
                Mark Student Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction('mark-student-unpaid')}
                disabled={!onBulkAction}
              >
                Mark Student Unpaid
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <DataTable
          data={paginatedClasses}
          columns={columns}
          isLoading={isLoading}
          error={error}
          title="Class Records"
          subtitle={`Showing ${totalFiltered} of ${totalItems} classes`}
          onRowClick={handleClassClick}
          pagination={{
            currentPage: page,
            pageSize: pageSize,
            totalItems: totalItems,
            totalPages: totalPages,
            onPageChange: onPageChange,
            onPageSizeChange: onPageSizeChange,
          }}
          emptyState={
            <div className="text-center py-12 text-muted-foreground">
              <p>No class logs found matching your filters</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          }
          errorState={
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          }
          cardClassName="overflow-hidden"
        />

        <AlertDialog
          open={confirmAction !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmAction(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction ? BULK_ACTION_LABELS[confirmAction] : ''}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will apply to {selectedIds.size} class record
                {selectedIds.size !== 1 ? 's' : ''}.{' '}
                {confirmAction === 'mark-tutor-unpaid' ||
                confirmAction === 'mark-student-unpaid'
                  ? 'Payment dates will be cleared.'
                  : "Payment dates will be set to today's date."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmBulk} disabled={isBusy}>
                {isBusy ? 'Updating…' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);

ClassTable.displayName = 'ClassTable';

export default ClassTable;
