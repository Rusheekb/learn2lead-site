import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ContentShareItem } from '@/types/sharedTypes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

const log = logger.create('useContentShareData');

export const useContentShareData = (userId?: string, fetchUsers?: () => Promise<any[]>) => {
  const [users, setUsers] = useState<any[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch content shares via React Query
  const { data: shares = [], isLoading, error } = useQuery({
    queryKey: ['content-shares', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('content_shares')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ContentShareItem[];
    },
    enabled: !!user?.id,
  });

  // Lightweight realtime subscription that invalidates React Query cache
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('content-shares-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_shares' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['content-shares', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const handleDownload = async (filePath: string | null) => {
    if (!filePath) return;
    try {
      const { data, error } = await supabase.storage
        .from('shared_content')
        .createSignedUrl(filePath, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      log.error('Failed to download file', err);
    }
  };

  const markAsViewed = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('content_shares')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', shareId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['content-shares', user?.id] });
    } catch (err) {
      log.error('Failed to mark share as viewed', err);
    }
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown User';
  };

  return {
    shares,
    isLoading,
    error,
    users,
    handleDownload,
    markAsViewed,
    getUserName,
  };
};
