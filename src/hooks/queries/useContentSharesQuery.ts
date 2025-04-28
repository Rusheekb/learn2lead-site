
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchContentShares, 
  createContentShare, 
  updateContentShare, 
  deleteContentShare 
} from '@/services/content/contentShareService';
import { ContentShareItem } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Query keys
export const contentSharesKeys = {
  all: ['contentShares'] as const,
  lists: () => [...contentSharesKeys.all, 'list'] as const,
  detail: (id: string) => [...contentSharesKeys.all, 'detail', id] as const,
  user: (userId: string) => [...contentSharesKeys.all, 'user', userId] as const,
};

export const useContentSharesQuery = () => {
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

  // Create a new content share
  const createMutation = useMutation({
    mutationFn: createContentShare,
    onSuccess: (newShare) => {
      toast.success('Content shared successfully');
      queryClient.invalidateQueries({ queryKey: contentSharesKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to share content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Update a content share
  const updateMutation = useMutation({
    mutationFn: updateContentShare,
    onSuccess: (updatedShare) => {
      toast.success('Content share updated successfully');
      queryClient.invalidateQueries({ queryKey: contentSharesKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to update content share: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Delete a content share
  const deleteMutation = useMutation({
    mutationFn: deleteContentShare,
    onSuccess: (deletedShare) => {
      toast.success('Content share deleted successfully');
      queryClient.invalidateQueries({ queryKey: contentSharesKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to delete content share: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
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
    createShare: createMutation.mutate,
    updateShare: updateMutation.mutate,
    deleteShare: deleteMutation.mutate,
  };
};

// Hook for fetching content shares for a specific user
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
