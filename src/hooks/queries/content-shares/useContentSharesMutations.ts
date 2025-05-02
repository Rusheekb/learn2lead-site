
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContentShare, updateContentShare, deleteContentShare } from '@/services/content/contentShareService';
import { ContentShareItem } from '@/types/sharedTypes';
import { toast } from 'sonner';
import { contentSharesKeys } from './queryKeys';

/**
 * Hook providing mutations for content shares (create, update, delete)
 */
export const useContentSharesMutations = () => {
  const queryClient = useQueryClient();

  // Create a new content share
  const createMutation = useMutation({
    mutationFn: createContentShare,
    onSuccess: () => {
      toast.success('Content shared successfully');
      queryClient.invalidateQueries({ queryKey: contentSharesKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to share content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Update a content share
  const updateMutation = useMutation({
    mutationFn: (params: { id: string, updates: Partial<ContentShareItem> }) =>
      updateContentShare(params.id, params.updates),
    onSuccess: () => {
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
    onSuccess: () => {
      toast.success('Content share deleted successfully');
      queryClient.invalidateQueries({ queryKey: contentSharesKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to delete content share: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  return {
    createShare: createMutation.mutate,
    updateShare: (id: string, updates: Partial<ContentShareItem>) => 
      updateMutation.mutate({ id, updates }),
    deleteShare: deleteMutation.mutate,
  };
};
