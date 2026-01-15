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
      cell: (student) => <span className="font-medium">{student.name}</span>,
    },
    {
      header: 'Subjects',
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
          onClick={() => onSelectStudent(student)}
        >
          View Details
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
