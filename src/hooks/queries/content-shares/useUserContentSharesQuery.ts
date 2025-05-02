
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { contentSharesKeys } from './queryKeys';

/**
 * Hook for fetching content shares for a specific user
 */
export const useUserContentSharesQuery = (userId: string) => {
  const queryClient = useQueryClient();

  const fetchUserShares = async () => {
    const result = await supabase
      .from('content_shares')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      
    if (result.error) {
      throw result.error;
    }
    
    return result.data || [];
  };

  // Fetch user's content shares
  const { 
    data: userShares = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: contentSharesKeys.user(userId),
    queryFn: fetchUserShares,
    enabled: !!userId,
  });

  // Setup realtime subscription for user-specific updates
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`user-content-shares-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_shares',
          filter: `sender_id=eq.${userId} OR receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Realtime update for user content shares:', payload);
          
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: contentSharesKeys.user(userId) });
          
          // Show toast based on the event type
          if (payload.eventType === 'INSERT') {
            toast.info('New content has been shared');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return {
    userShares,
    isLoading,
    error,
    refetch: () => refetch(),
  };
};
