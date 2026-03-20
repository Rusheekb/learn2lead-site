
import React, { memo, useMemo } from 'react';
import VirtualizedDataTable, { ColumnDefinition } from '@/components/common/VirtualizedDataTable';
import { ActionButton } from '@/components/common/ActionButton';
import { Edit2, Trash2 } from 'lucide-react';
import { Tutor } from '@/types/tutorTypes';

interface TutorTableProps {
  tutors: Tutor[];
  isLoading: boolean;
  onDelete: (tutorId: string) => void;
  onSelect: (tutor: Tutor) => void;
}

const TutorTable: React.FC<TutorTableProps> = memo(({
  tutors,
  isLoading,
  onDelete,
  onSelect,
}) => {
  const columns: ColumnDefinition<Tutor>[] = useMemo(() => [
    {
      header: 'Tutor',
      cell: (tutor) => (
        <div className="flex flex-col min-w-0">
          <div className="font-medium truncate">{tutor.name}</div>
          <div className="text-xs text-muted-foreground truncate">{tutor.email}</div>
          {/* Show rate on mobile inline */}
          <div className="sm:hidden mt-0.5">
            <span className="text-xs text-muted-foreground">
              {tutor.hourlyRate != null ? `$${Number(tutor.hourlyRate).toFixed(2)}/hr` : '—'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Hourly Rate',
      className: 'hidden sm:table-cell',
      cell: (tutor) => (
        <span className="text-sm">
          {tutor.hourlyRate != null ? `$${Number(tutor.hourlyRate).toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (tutor) => (
        <div className="flex items-center gap-1">
          <ActionButton variant="ghost" size="icon" tooltip="Edit tutor">
            <Edit2 className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            variant="ghost"
            size="icon"
            tooltip="Delete tutor"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tutor.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </ActionButton>
        </div>
      ),
    },
  ], [onDelete]);

  return (
    <VirtualizedDataTable
      data={tutors}
      columns={columns}
      isLoading={isLoading}
      onRowClick={onSelect}
      emptyState={
        <div className="text-center py-12 text-muted-foreground">
          <p>No tutors found matching your criteria.</p>
        </div>
      }
      showCard={false}
      virtualizationThreshold={30}
      maxHeight={400}
    />
  );
});

TutorTable.displayName = 'TutorTable';

export default TutorTable;
