import React, { memo, useMemo } from 'react';
import VirtualizedDataTable, {
  ColumnDefinition,
} from '@/components/common/VirtualizedDataTable';
import { Badge } from '@/components/ui/badge';
import { Tutor } from '@/types/tutorTypes';

interface TutorTableProps {
  tutors: Tutor[];
  isLoading: boolean;
  onSelect: (tutor: Tutor) => void;
}

const TutorTable: React.FC<TutorTableProps> = memo(
  ({ tutors, isLoading, onSelect }) => {
    const columns: ColumnDefinition<Tutor>[] = useMemo(
      () => [
        {
          header: 'Tutor',
          cell: (tutor) => (
            <div className="flex flex-col min-w-0 gap-0.5">
              <div className="font-medium truncate">{tutor.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {tutor.email}
              </div>
              {tutor.subjects && tutor.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {tutor.subjects.slice(0, 3).map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {s}
                    </Badge>
                  ))}
                  {tutor.subjects.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      +{tutor.subjects.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              {/* Show rate on mobile inline */}
              <div className="sm:hidden mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {tutor.hourlyRate != null
                    ? `$${Number(tutor.hourlyRate).toFixed(2)}/hr`
                    : '—'}
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
              {tutor.hourlyRate != null
                ? `$${Number(tutor.hourlyRate).toFixed(2)}`
                : '—'}
            </span>
          ),
        },
      ],
      []
    );

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
  }
);

TutorTable.displayName = 'TutorTable';

export default TutorTable;
