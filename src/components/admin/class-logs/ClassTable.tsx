
import React from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { format } from 'date-fns';
import { StatusBadge, AttendanceBadge } from './BadgeComponents';
import { CircleMessageBadge } from '@/components/shared/ClassBadges';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/types/tutorTypes';

interface ClassTableProps {
  classes: ClassEvent[];
  filteredClasses: ClassEvent[];
  paginatedClasses: ClassEvent[];
  isLoading: boolean;
  error?: string | null;
  handleClassClick: (cls: ClassEvent) => void;
  clearFilters: () => void;
  getUnreadMessageCount: (classId: string) => number;
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

    const dateObj = date instanceof Date ? date : new Date(date);

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
  getUnreadMessageCount,
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
      header: 'Class Details',
      cell: (cls) => (
        <div className="space-y-1">
          <div className="font-medium">{cls.title}</div>
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
            {cls.startTime && cls.endTime
              ? `${formatTime(cls.startTime)} - ${formatTime(cls.endTime)}`
              : 'Time not set'}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (cls) => (
        <StatusBadge status={cls.status || 'unknown'} />
      ),
    },
    {
      header: 'Attendance',
      cell: (cls) => (
        <AttendanceBadge attendance={cls.attendance || 'pending'} />
      ),
    },
    {
      header: 'Messages',
      cell: (cls) => (
        <CircleMessageBadge count={getUnreadMessageCount(cls.id)} />
      ),
    },
    {
      header: 'Actions',
      cell: (cls) => (
        <Button variant="ghost" size="sm" className="hover:bg-muted">
          View Details
        </Button>
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
