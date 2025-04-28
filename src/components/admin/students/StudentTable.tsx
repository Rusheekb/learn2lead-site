
import React from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  status: 'active' | 'inactive' | 'pending';
  enrollDate: string;
  lastSession: string;
  paymentStatus: 'paid' | 'unpaid' | 'overdue';
}

interface StudentTableProps {
  students: Student[];
  isLoading: boolean;
  onDeleteStudent: (studentId: string) => void;
}

// Map status and payment status to badge variants
const statusBadgeVariants: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  active: 'default',
  inactive: 'secondary',
  pending: 'outline',
};

const paymentBadgeVariants: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  paid: 'default',
  unpaid: 'outline',
  overdue: 'destructive',
};

// Helper function to format date
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    return dateString;
  }
};

// Helper to capitalize strings
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  isLoading,
  onDeleteStudent,
}) => {
  const columns: ColumnDefinition<Student>[] = [
    {
      header: 'Student',
      cell: (student) => (
        <div className="flex flex-col">
          <div className="font-medium">{student.name}</div>
          <div className="text-sm text-muted-foreground">{student.email}</div>
        </div>
      ),
    },
    {
      header: 'Grade',
      accessorKey: 'grade',
    },
    {
      header: 'Subjects',
      cell: (student) => student.subjects.join(', '),
      className: 'hidden md:table-cell',
    },
    {
      header: 'Status',
      cell: (student) => (
        <Badge variant={statusBadgeVariants[student.status] || 'default'}>
          {capitalize(student.status)}
        </Badge>
      ),
    },
    {
      header: 'Payment',
      cell: (student) => (
        <Badge variant={paymentBadgeVariants[student.paymentStatus] || 'default'}>
          {capitalize(student.paymentStatus)}
        </Badge>
      ),
    },
    {
      header: 'Last Session',
      cell: (student) => formatDate(student.lastSession),
      className: 'hidden md:table-cell',
    },
    {
      header: 'Actions',
      cell: (student) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteStudent(student.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <DataTable
        data={students}
        columns={columns}
        isLoading={isLoading}
        emptyState={
          <div className="text-center py-12 text-gray-500">
            <p>No students found matching your criteria.</p>
          </div>
        }
        showCard={false}
      />
    </div>
  );
};

export default StudentTable;
