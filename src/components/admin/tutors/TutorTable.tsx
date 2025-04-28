
import React from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { Tutor } from '@/types/tutorTypes';

interface TutorTableProps {
  tutors: Tutor[];
  isLoading: boolean;
  onDelete: (tutorId: string) => void;
  onSelect: (tutor: Tutor) => void;
}

const TutorTable: React.FC<TutorTableProps> = ({
  tutors,
  isLoading,
  onDelete,
  onSelect,
}) => {
  const columns: ColumnDefinition<Tutor>[] = [
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
      header: 'Subjects',
      cell: (tutor) => tutor.subjects.join(', ') || 'None',
    },
    {
      header: 'Rating',
      cell: (tutor) => `${tutor.rating}/5`,
    },
    {
      header: 'Classes',
      accessorKey: 'classes',
    },
    {
      header: 'Hourly Rate',
      cell: (tutor) => `$${tutor.hourlyRate}/hr`,
    },
    {
      header: 'Actions',
      cell: (tutor) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tutor.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={tutors}
      columns={columns}
      isLoading={isLoading}
      onRowClick={onSelect}
      emptyState={
        <div className="text-center py-12 text-gray-500">
          <p>No tutors found matching your criteria.</p>
        </div>
      }
      showCard={false}
    />
  );
};

export default TutorTable;
