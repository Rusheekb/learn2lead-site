
import React, { memo, useCallback } from 'react';
import { Tutor } from '@/types/tutorTypes';
import TutorTable from './tutors/TutorTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/filters/SearchInput';
import PaginationControls from '@/components/common/Pagination';
import { useTutorsQuery } from '@/hooks/queries/useTutorsQuery';

interface TutorsManagerProps {
  onSelect: (tutor: Tutor) => void;
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

  const handleDeleteTutor = useCallback(async (tutorId: string) => {
    try {
      await deleteTutorMutation(tutorId);
      toast.success("Tutor deleted successfully");
    } catch (error) {
      console.error('Error deleting tutor:', error);
      toast.error("Failed to delete tutor");
    }
  }, [deleteTutorMutation]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Tutors Management</h2>

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
            tutors={tutors} 
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
