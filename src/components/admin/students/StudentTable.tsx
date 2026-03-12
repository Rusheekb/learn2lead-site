
import React, { memo, useMemo } from 'react';
import VirtualizedDataTable, { ColumnDefinition } from '@/components/common/VirtualizedDataTable';
import { ActionButton } from '@/components/common/ActionButton';
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
  paymentMethod?: 'stripe' | 'zelle';
  classRate?: number | null;
}

interface StudentTableProps {
  students: Student[];
  isLoading: boolean;
  onDeleteStudent: (studentId: string) => void;
}

// Helper function to format date
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    return dateString;
  }
};

const StudentTable: React.FC<StudentTableProps> = memo(({
  students,
  isLoading,
  onDeleteStudent,
}) => {
  const columns: ColumnDefinition<Student>[] = useMemo(() => [
    {
      header: 'Student',
      cell: (student) => (
        <div className="flex flex-col">
          <div className="font-medium">{student.name}</div>
          <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">{student.email}</div>
          {/* Show extra info on mobile inline */}
          <div className="flex flex-wrap gap-1.5 mt-1 sm:hidden">
            <Badge variant={student.paymentMethod === 'stripe' ? 'default' : 'secondary'} className="text-[10px]">
              {student.paymentMethod === 'stripe' ? 'Stripe' : 'Zelle'}
            </Badge>
            {student.classRate != null && (
              <span className="text-xs text-muted-foreground">${Number(student.classRate).toFixed(2)}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Payment Method',
      className: 'hidden sm:table-cell',
      cell: (student) => (
        <Badge variant={student.paymentMethod === 'stripe' ? 'default' : 'secondary'}>
          {student.paymentMethod === 'stripe' ? 'Stripe' : 'Zelle'}
        </Badge>
      ),
    },
    {
      header: 'Class Rate',
      className: 'hidden sm:table-cell',
      cell: (student) => (
        <span className="font-medium">
          {student.classRate != null ? `$${Number(student.classRate).toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      header: 'Last Session',
      className: 'hidden md:table-cell',
      cell: (student) => formatDate(student.lastSession),
    },
    {
      header: 'Actions',
      cell: (student) => (
        <div className="flex items-center gap-1">
          <ActionButton variant="ghost" size="icon" tooltip="Edit student">
            <Edit2 className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            variant="ghost"
            size="icon"
            tooltip="Delete student"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteStudent(student.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </ActionButton>
        </div>
      ),
    },
  ], [onDeleteStudent]);

  return (
    <div className="overflow-x-auto">
      <VirtualizedDataTable
        data={students}
        columns={columns}
        isLoading={isLoading}
        emptyState={
          <div className="text-center py-12 text-muted-foreground">
            <p>No students found matching your criteria.</p>
          </div>
        }
        showCard={false}
        virtualizationThreshold={30}
        maxHeight={400}
      />
    </div>
  );
});

StudentTable.displayName = 'StudentTable';

export default StudentTable;
