import React, { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

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

// Memoize the formatting function to prevent recalculation
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch (error) {
    return dateString;
  }
};

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

// Create a memoized StudentRow component
const StudentRow = memo(
  ({
    student,
    onDelete,
  }: {
    student: Student;
    onDelete: (id: string) => void;
  }) => {
    const statusVariant = statusBadgeVariants[student.status] || 'default';
    const paymentVariant =
      paymentBadgeVariants[student.paymentStatus] || 'default';

    const capitalize = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1);

    return (
      <TableRow>
        <TableCell>
          <div className="flex flex-col">
            <div className="font-medium">{student.name}</div>
            <div className="text-sm text-muted-foreground">{student.email}</div>
          </div>
        </TableCell>
        <TableCell>{student.grade}</TableCell>
        <TableCell className="hidden md:table-cell">
          {student.subjects.join(', ')}
        </TableCell>
        <TableCell>
          <Badge variant={statusVariant}>{capitalize(student.status)}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={paymentVariant}>
            {capitalize(student.paymentStatus)}
          </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {student.lastSession === 'N/A'
            ? 'N/A'
            : formatDate(student.lastSession)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(student.id)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }
);

StudentRow.displayName = 'StudentRow';

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  isLoading,
  onDeleteStudent,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p>Loading students...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No students found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead className="hidden md:table-cell">Subjects</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="hidden md:table-cell">Last Session</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onDelete={onDeleteStudent}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StudentTable;
