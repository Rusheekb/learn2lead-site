import React, { memo, useMemo } from 'react';
import VirtualizedDataTable, {
  ColumnDefinition,
} from '@/components/common/VirtualizedDataTable';
import { ActionButton } from '@/components/common/ActionButton';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface Student {
  id: string;
  profileId?: string | null;
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
  creditsRemaining?: number | null;
  nextClassDate?: string | null;
}

interface StudentTableProps {
  students: Student[];
  isLoading: boolean;
  onDeleteStudent: (studentId: string) => void;
  onStudentClick?: (student: Student) => void;
}

const safeDateFormat = (dateStr: string | null | undefined, fmt: string) => {
  if (!dateStr) return null;
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
};

function creditsBadge(credits: number | null | undefined) {
  if (credits == null) return null;
  if (credits === 0)
    return (
      <Badge variant="destructive" className="text-xs shrink-0">
        0 hrs
      </Badge>
    );
  if (credits <= 2)
    return (
      <Badge className="text-xs shrink-0 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100">
        {credits} hr{credits !== 1 ? 's' : ''}
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs shrink-0">
      {credits} hr{credits !== 1 ? 's' : ''}
    </Badge>
  );
}

function statusDot(student: Student) {
  const credits = student.creditsRemaining ?? null;
  if (!student.status || student.status !== 'active') {
    return (
      <span
        className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block shrink-0"
        title="Inactive"
      />
    );
  }
  if (credits === 0)
    return (
      <span
        className="w-2 h-2 rounded-full bg-destructive inline-block shrink-0"
        title="No credits"
      />
    );
  if (credits != null && credits <= 2)
    return (
      <span
        className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0"
        title="Low credits"
      />
    );
  return (
    <span
      className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"
      title="Active"
    />
  );
}

const StudentTable: React.FC<StudentTableProps> = memo(
  ({ students, isLoading, onDeleteStudent, onStudentClick }) => {
    const columns: ColumnDefinition<Student>[] = useMemo(
      () => [
        {
          header: 'Student',
          cell: (student) => (
            <div className="flex items-start gap-2 min-w-0">
              <div className="mt-1.5">{statusDot(student)}</div>
              <div className="flex flex-col min-w-0">
                <div className="font-medium truncate">{student.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {student.email}
                </div>
                {/* Mobile: show credits inline */}
                <div className="flex flex-wrap gap-1.5 mt-1 sm:hidden">
                  {creditsBadge(student.creditsRemaining ?? null)}
                  {student.classRate != null && (
                    <span className="text-xs text-muted-foreground">
                      ${Number(student.classRate).toFixed(2)}/hr
                    </span>
                  )}
                </div>
              </div>
            </div>
          ),
        },
        {
          header: 'Credits',
          className: 'hidden sm:table-cell',
          cell: (student) =>
            creditsBadge(student.creditsRemaining ?? null) ?? (
              <span className="text-muted-foreground text-xs">—</span>
            ),
        },
        {
          header: 'Rate',
          className: 'hidden sm:table-cell',
          cell: (student) => (
            <span className="font-medium text-sm">
              {student.classRate != null
                ? `$${Number(student.classRate).toFixed(2)}`
                : '—'}
            </span>
          ),
        },
        {
          header: 'Last Class',
          className: 'hidden md:table-cell',
          cell: (student) => {
            const d = safeDateFormat(
              student.lastSession || null,
              'MMM d, yyyy'
            );
            return (
              <span className="text-sm text-muted-foreground">
                {d || 'Never'}
              </span>
            );
          },
        },
        {
          header: 'Next Class',
          className: 'hidden lg:table-cell',
          cell: (student) => {
            const d = safeDateFormat(student.nextClassDate || null, 'MMM d');
            return d ? (
              <span className="text-sm font-medium text-primary">{d}</span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            );
          },
        },
        {
          header: '',
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
      ],
      [onDeleteStudent]
    );

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
          maxHeight={500}
          onRowClick={onStudentClick}
        />
      </div>
    );
  }
);

StudentTable.displayName = 'StudentTable';

export default StudentTable;
