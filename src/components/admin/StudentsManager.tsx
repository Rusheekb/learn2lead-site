import React, { memo } from 'react';
import { Student } from '@/types/tutorTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SearchInput from '@/components/shared/filters/SearchInput';
import PaginationControls from '@/components/common/Pagination';
import { useStudentsQuery } from '@/hooks/queries/useStudentsQuery';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';

interface StudentsManagerProps {
  onSelect: (student: Student) => void;
}

const StudentsManager: React.FC<StudentsManagerProps> = memo(({ onSelect }) => {
  const {
    students,
    isLoading,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    searchTerm,
    setSearchTerm,
  } = useStudentsQuery();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Students Management</h2>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Student Directory</CardTitle>
            <SearchInput
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              placeholder="Search students..."
              className="w-full md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-4">No students found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Email
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => onSelect(student)}
                    >
                      <TableCell>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {student.email}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {student.email}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            onPageChange={goToPage}
            className="mt-4"
          />
        </CardContent>
      </Card>
    </div>
  );
});

StudentsManager.displayName = 'StudentsManager';

export default StudentsManager;
