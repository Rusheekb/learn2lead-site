import React, { memo, useCallback, useMemo } from 'react';
import { Tutor } from '@/types/tutorTypes';
import TutorTable from './tutors/TutorTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/filters/SearchInput';
import PaginationControls from '@/components/common/Pagination';
import { useTutorsQuery } from '@/hooks/queries/useTutorsQuery';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const log = logger.create('TutorsManager');

interface TutorsManagerProps {
  onSelect: (tutor: Tutor) => void;
}

interface RatingRow {
  tutor_name: string;
  avg_rating: number;
  rating_count: number;
}

const TutorsManager: React.FC<TutorsManagerProps> = memo(({ onSelect }) => {
  const {
    tutors,
    isLoading,
    deleteTutor: deleteTutorMutation,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    searchTerm,
    setSearchTerm,
  } = useTutorsQuery();

  const { data: ratingsData = [] } = useQuery<RatingRow[]>({
    queryKey: ['tutor-ratings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tutor_ratings');
      if (error) throw error;
      return (data as unknown as RatingRow[]) || [];
    },
    staleTime: 5 * 60_000,
  });

  const tutorsWithRatings = useMemo<Tutor[]>(() => {
    if (ratingsData.length === 0) return tutors;
    const ratingsByName = new Map(ratingsData.map((r) => [r.tutor_name, r]));
    return tutors.map((t) => {
      const r = ratingsByName.get(t.name);
      return r
        ? {
            ...t,
            rating: Number(r.avg_rating),
            ratingCount: Number(r.rating_count),
          }
        : t;
    });
  }, [tutors, ratingsData]);

  const handleDeleteTutor = useCallback(
    async (tutorId: string) => {
      try {
        await deleteTutorMutation(tutorId);
        toast.success('Tutor deleted successfully');
      } catch (error) {
        log.error('Error deleting tutor:', error);
        toast.error('Failed to delete tutor');
      }
    },
    [deleteTutorMutation]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
        Tutors Management
      </h2>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Tutor Directory</CardTitle>
            <SearchInput
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              placeholder="Search tutors..."
              className="w-full md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <TutorTable
            tutors={tutorsWithRatings}
            isLoading={isLoading}
            onDelete={handleDeleteTutor}
            onSelect={onSelect}
          />

          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            onPageChange={goToPage}
            className="mt-4"
          />
        </CardContent>
      </Card>
    </div>
  );
});

TutorsManager.displayName = 'TutorsManager';

export default TutorsManager;
