
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentShareItem } from '@/types/sharedTypes';
import { Profile } from '@/hooks/useProfile';
import { useContentSharesRealtime } from '@/hooks/realtime/useContentSharesRealtime';

export const useContentShareData = (
  userId: string | undefined,
  fetchUsers: () => Promise<Profile[]>
) => {
  const [shares, setShares] = useState<ContentShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  
  // Set up realtime subscription with explicit typing
  useContentSharesRealtime(setShares);

  const loadShares = useCallback(async () => {
    if (!userId) {
      setShares([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_shares')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (error) {
        console.error('Error fetching shares:', error);
        toast.error('Failed to load shared content');
      } else {
        setShares(data || []);
      }
    } catch (error) {
      console.error('Error in loadShares:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadUsers = useCallback(async () => {
    try {
      const loadedUsers = await fetchUsers();
      setUsers(loadedUsers.filter((u) => u.id !== userId));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  }, [fetchUsers, userId]);

  useEffect(() => {
    if (userId) {
      let mounted = true;
      
      const loadData = async () => {
        await Promise.all([loadShares(), loadUsers()]);
      };
      
      loadData();
      
      return () => {
        mounted = false;
      };
    }
  }, [userId, loadShares, loadUsers]);

  const handleDownload = (filePath: string | null) => {
    if (filePath) {
      window.open(filePath, '_blank');
    }
  };

  const markAsViewed = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('content_shares')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', shareId)
        .eq('receiver_id', userId || '');

      if (error) throw error;

      loadShares();
    } catch (error) {
      console.error('Error marking as viewed:', error);
      toast.error('Failed to update view status');
    }
  };

  const getUserName = (userId: string) => {
    const userProfile = users.find((u) => u.id === userId);
    if (!userProfile) return 'Unknown User';
    return userProfile.first_name && userProfile.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : userProfile.email.split('@')[0];
  };

  return {
    shares,
    isLoading,
    users,
    loadShares,
    handleDownload,
    markAsViewed,
    getUserName
  };
};
