import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentShareItem } from '@/types/sharedTypes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';

export const useContentShareData = (userId?: string, fetchUsers?: () => Promise<any[]>) => {
  const [shares, setShares] = useState<ContentShareItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { user } = useAuth();

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

  const loadShares = async () => {
    // Mock function
  };

  const handleDownload = (filePath: string | null) => {
    // Mock function
  };

  const markAsViewed = (shareId: string) => {
    // Mock function
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown User';
  };

  return {
    shares,
    isLoading,
    error,
    users,
    loadShares,
    handleDownload,
    markAsViewed,
    getUserName,
  };
};