
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useDataFetchingEffects(
  userId: string | undefined,
  refetchClasses: () => void,
  queryClient: any
) {
  // Ensure we refetch classes when component mounts and user ID changes
  useEffect(() => {
    if (userId) {
      refetchClasses();
      // Enhanced invalidation to be more specific
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses', userId] });
    }
  }, [userId, refetchClasses, queryClient]);

  return {};
}
