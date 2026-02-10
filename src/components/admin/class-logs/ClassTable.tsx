
import React from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/common/ActionButton';
import { Badge } from '@/components/ui/badge';
import { ClassEvent } from '@/types/tutorTypes';
import { formatTimeRange } from '@/utils/dateTimeUtils';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ClassTableProps {
  classes: ClassEvent[];
  filteredClasses: ClassEvent[];
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
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  studentPaymentMethods?: Record<string, string>;
  onToggleStudentPayment?: (classId: string, currentlyPaid: boolean) => void;
  onToggleTutorPayment?: (classId: string, currentlyPaid: boolean) => void;
}

const formatDate = (date: Date | string) => {
  try {
    if (!date) return 'Date not available';
    const dateObj = parseDateToLocal(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return format(dateObj, 'MMM d, yyyy');
  } catch (e) {
    return String(date);
  }
};

const ClassTable: React.FC<ClassTableProps> = ({
  classes,
  filteredClasses,
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
  onPageChange,
  onPageSizeChange,
  studentPaymentMethods = {},
  onToggleStudentPayment,
  onToggleTutorPayment,
}) => {
  const getPaymentMethod = (studentName: string) => {
    return studentPaymentMethods[studentName] || 'zelle';
  };

  const columns: ColumnDefinition<ClassEvent>[] = [
    {
      header: 'Class ID',
      cell: (cls) => (
        <div className="font-mono text-sm">
          {cls.classNumber || '-'}
        </div>
      ),
    },
    {
      header: 'Class Details',
      cell: (cls) => (
        <div className="space-y-1">
          <div className="font-medium">{cls.title || cls.subject}</div>
          <div className="text-sm text-muted-foreground">
            <div>Tutor: {cls.tutorName}</div>
            <div>Student: {cls.studentName}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Date & Time',
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
      cell: (cls) => (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Class:</span>
            <span className="font-medium">${cls.classCost?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Tutor:</span>
            <span className="font-medium">${cls.tutorCost?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Payment Status',
      cell: (cls) => {
        const isStripe = getPaymentMethod(cls.studentName || '') === 'stripe';
        const studentPaid = !!cls.studentPaymentDate;
        const tutorPaid = !!cls.tutorPaymentDate;

        return (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {/* Student payment */}
            <div className="flex items-center gap-2">
              {isStripe ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <Badge variant="outline" className="text-[10px] px-1 py-0">Stripe</Badge>
                </>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={`w-2.5 h-2.5 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all ${studentPaid ? 'bg-emerald-500' : 'bg-destructive'}`}
                      title={studentPaid ? 'Student: Paid — click to mark unpaid' : 'Student: Unpaid — click to mark paid'}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" side="left">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {studentPaid ? 'Mark student payment as unpaid?' : 'Mark student payment as paid today?'}
                      </p>
                      <Button
                        size="sm"
                        variant={studentPaid ? 'outline' : 'default'}
                        onClick={() => onToggleStudentPayment?.(cls.id, studentPaid)}
                        className="w-full"
                      >
                        {studentPaid ? 'Mark Unpaid' : 'Mark Paid'}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <span className="text-xs text-muted-foreground">Student</span>
              {!isStripe && studentPaid && cls.studentPaymentDate && (
                <span className="text-xs font-medium">{format(cls.studentPaymentDate, 'M/d/yy')}</span>
              )}
            </div>
            {/* Tutor payment */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all ${tutorPaid ? 'bg-emerald-500' : 'bg-destructive'}`}
                    title={tutorPaid ? 'Tutor: Paid — click to mark unpaid' : 'Tutor: Unpaid — click to mark paid'}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="left">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {tutorPaid ? 'Mark tutor payment as unpaid?' : 'Mark tutor payment as paid today?'}
                    </p>
                    <Button
                      size="sm"
                      variant={tutorPaid ? 'outline' : 'default'}
                      onClick={() => onToggleTutorPayment?.(cls.id, tutorPaid)}
                      className="w-full"
                    >
                      {tutorPaid ? 'Mark Unpaid' : 'Mark Paid'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">Tutor</span>
              {tutorPaid && cls.tutorPaymentDate && (
                <span className="text-xs font-medium">{format(cls.tutorPaymentDate, 'M/d/yy')}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: (cls) => (
        <ActionButton variant="ghost" size="sm" tooltip="View class details">
          View Details
        </ActionButton>
      ),
    },
  ];

  return (
    <DataTable
      data={paginatedClasses}
      columns={columns}
      isLoading={isLoading}
      error={error}
      title="Class Records"
      subtitle={`Showing ${filteredClasses.length} of ${classes.length} classes`}
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
  );
};

export default ClassTable;
