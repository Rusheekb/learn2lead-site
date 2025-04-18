
import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { StatusBadge, AttendanceBadge } from "./BadgeComponents";
import { CircleMessageBadge } from "@/components/shared/ClassBadges";
import TablePagination from "./TablePagination";
import { ClassEvent } from "@/types/tutorTypes";

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

// Format date once and memo it
const formatDate = (date: Date | string) => {
  try {
    if (!date) return 'Date not available';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return format(dateObj, "MMM d, yyyy");
  } catch (e) {
    return String(date);
  }
};

// Memoize the ClassRow component to prevent unnecessary re-renders
const ClassRow = memo(({ 
  cls, 
  formatTime, 
  getUnreadMessageCount, 
  handleClassClick 
}: { 
  cls: ClassEvent, 
  formatTime: (time: string) => string, 
  getUnreadMessageCount: (classId: string) => number,
  handleClassClick: (cls: ClassEvent) => void 
}) => {
  return (
    <TableRow key={cls.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleClassClick(cls)}>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{cls.title}</div>
          <div className="text-sm text-muted-foreground">
            <div>Tutor: {cls.tutorName}</div>
            <div>Student: {cls.studentName}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div>{formatDate(cls.date)}</div>
          <div className="text-sm text-muted-foreground">
            {cls.startTime && cls.endTime ? (
              `${formatTime(cls.startTime)} - ${formatTime(cls.endTime)}`
            ) : (
              'Time not set'
            )}
          </div>
        </div>
      </TableCell>
      <TableCell><StatusBadge status={cls.status} /></TableCell>
      <TableCell><AttendanceBadge attendance={cls.attendance || 'pending'} /></TableCell>
      <TableCell>
        <CircleMessageBadge count={getUnreadMessageCount(cls.id)} />
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" className="hover:bg-muted">
          View Details
        </Button>
      </TableCell>
    </TableRow>
  );
});

ClassRow.displayName = 'ClassRow';

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
  onPageSizeChange
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>Class Records</CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing {filteredClasses.length} of {classes.length} classes
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <p>Loading class logs...</p>
          </div>
        ) : error ? (
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
        ) : filteredClasses.length === 0 ? (
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
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Details</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClasses.map((cls) => (
                    <ClassRow
                      key={cls.id}
                      cls={cls}
                      formatTime={formatTime}
                      getUnreadMessageCount={getUnreadMessageCount}
                      handleClassClick={handleClassClick}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredClasses.length > 0 && (
              <TablePagination
                currentPage={page}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassTable;
