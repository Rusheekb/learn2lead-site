
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { StatusBadge, AttendanceBadge } from "./BadgeComponents";
import TablePagination from "./TablePagination";

interface ClassTableProps {
  classes: any[];
  filteredClasses: any[];
  paginatedClasses: any[];
  isLoading: boolean;
  handleClassClick: (cls: any) => void;
  clearFilters: () => void;
  getUnreadMessageCount: (classId: number) => number;
  formatTime: (time: string) => string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const ClassTable: React.FC<ClassTableProps> = ({
  classes,
  filteredClasses,
  paginatedClasses,
  isLoading,
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Class Records</CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing {filteredClasses.length} of {classes.length} classes
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <p>Loading class logs...</p>
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
                        <div>{format(new Date(cls.date), "MMM d, yyyy")}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={cls.status} /></TableCell>
                    <TableCell><AttendanceBadge attendance={cls.attendance} /></TableCell>
                    <TableCell>
                      {getUnreadMessageCount(cls.id) > 0 && (
                        <div className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-red-500 rounded-full">
                          {getUnreadMessageCount(cls.id)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="hover:bg-muted">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
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
