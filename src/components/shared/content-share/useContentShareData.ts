import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentShareItem } from '@/types/sharedTypes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';
import { logger } from '@/lib/logger';

const log = logger.create('useContentShareData');

export const useContentShareData = (userId?: string, fetchUsers?: () => Promise<any[]>) => {
  const [shares, setShares] = useState<ContentShareItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use simplified realtime manager
  useRealtimeManager({
    userId: user?.id,
    userRole: user?.user_metadata?.role,
    setContentShares: setShares,
  });

  // Fetch content shares
  const { data: shareData, isLoading, error } = useQuery({
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

  useEffect(() => {
    if (shareData) {
      setShares(shareData);
    }
  }, [shareData]);

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
      setShares(prev => prev.map(s => s.id === shareId ? { ...s, viewed_at: new Date().toISOString() } : s));
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
