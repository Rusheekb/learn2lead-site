import React, { memo } from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Student } from '@/types/sharedTypes';
import { Badge } from '@/components/ui/badge';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

const StudentList: React.FC<StudentListProps> = memo(({
  students,
  onSelectStudent,
}) => {
  const columns: ColumnDefinition<Student>[] = [
    {
      header: 'Name',
      cell: (student) => (
        <div>
          <span className="font-medium">{student.name}</span>
          {/* Show subjects inline on mobile */}
          <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
            {student.subjects.slice(0, 2).map((subject, index) => (
              <Badge key={index} variant="outline" className="text-[10px] px-1 py-0">
                {subject}
              </Badge>
            ))}
            {student.subjects.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{student.subjects.length - 2}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Subjects',
      className: 'hidden sm:table-cell',
      cell: (student) => (
        <div className="flex flex-wrap gap-1">
          {student.subjects.map((subject, index) => (
            <Badge key={index} variant="outline">
              {subject}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: 'Next Session',
      className: 'hidden md:table-cell',
      cell: (student) => (
        student.nextSession
          ? new Date(student.nextSession).toLocaleDateString()
          : 'Not scheduled'
      ),
    },
    {
      header: 'Actions',
      cell: (student) => (
        <Button
          variant="outline"
          size="sm"
          className="text-xs sm:text-sm"
          onClick={() => onSelectStudent(student)}
        >
          <span className="hidden sm:inline">View Details</span>
          <span className="sm:hidden">View</span>
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      data={students}
      columns={columns}
      showCard={false}
    />
  );
});

StudentList.displayName = 'StudentList';

export default StudentList;
