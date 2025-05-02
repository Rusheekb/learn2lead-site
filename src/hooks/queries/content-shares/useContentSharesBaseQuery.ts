
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchContentShares } from '@/services/content/contentShareService';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { contentSharesKeys } from './queryKeys';

/**
 * Hook for fetching all content shares with realtime updates
 */
export const useContentSharesBaseQuery = () => {
  const queryClient = useQueryClient();

  // Fetch all content shares
  const { 
    data: shares = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: contentSharesKeys.lists(),
    queryFn: fetchContentShares,
  });

  // Setup realtime subscription to update query cache
  useEffect(() => {
    const channel = supabase
      .channel('content-shares-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_shares',
        },
        (payload) => {
          console.log('Realtime update for content shares:', payload);
          
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: contentSharesKeys.lists() });
          
          // Show toast based on the event type
          if (payload.eventType === 'INSERT') {
            toast.info('New content shared');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Content share updated');
          } else if (payload.eventType === 'DELETE') {
            toast.info('Content share removed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    shares,
    isLoading,
    error,
    refetch: () => refetch(),
  };
};
