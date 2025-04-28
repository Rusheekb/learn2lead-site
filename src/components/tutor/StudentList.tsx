
import React from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Student } from '@/types/sharedTypes';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({
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
      cell: (student) => student.subjects.join(', '),
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
};

export default StudentList;
