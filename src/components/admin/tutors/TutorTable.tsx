
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
        <div className="flex flex-col">
          <div className="font-medium">{tutor.name}</div>
          <div className="text-sm text-muted-foreground">{tutor.email}</div>
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (tutor) => (
        <div className="flex items-center gap-2">
          <ActionButton variant="ghost" size="icon">
            <Edit2 className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            variant="ghost"
            size="icon"
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
