
import React from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { format } from 'date-fns';
import { CircleMessageBadge } from '@/components/shared/ClassBadges';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/common/ActionButton';
import { ClassEvent } from '@/types/tutorTypes';
import { formatTimeRange } from '@/utils/dateTimeUtils';
import { parseDateToLocal } from '@/utils/safeDateUtils';

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
}

// Format date helper function
const formatDate = (date: Date | string) => {
  try {
    if (!date) return 'Date not available';

    const dateObj = parseDateToLocal(date);

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

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
}) => {
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
      cell: (cls) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cls.studentPaymentDate ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">Student:</span>
            <span className="text-sm font-medium">
              {cls.studentPaymentDate ? format(cls.studentPaymentDate, 'M/d/yy') : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cls.tutorPaymentDate ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">Tutor:</span>
            <span className="text-sm font-medium">
              {cls.tutorPaymentDate ? format(cls.tutorPaymentDate, 'M/d/yy') : ''}
            </span>
          </div>
        </div>
      ),
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
        <div className="text-center py-12 text-gray-500">
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
        <div className="text-center py-12 text-red-500">
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
