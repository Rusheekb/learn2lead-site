import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const log = logger.create('useProfile');

export type AppRole = 'student' | 'tutor' | 'admin' | 'parent';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  bio: string | null;
  avatar_url: string | null;
  zoom_link: string | null;
  /** Unique sign-in name (lowercase). */
  username?: string;
  /** A parent set this student's password; they must choose their own. */
  must_change_password?: boolean;
  /** Added by a parent (family accounts). */
  managed?: boolean;
  /** IANA zone, e.g. America/Los_Angeles; null until first detected. */
  timezone?: string | null;
  created_at: string;
  updated_at: string;
}

const profileKeys = {
  all: ['profiles'] as const,
  detail: (id: string) => [...profileKeys.all, id] as const,
};

async function fetchProfileById(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    log.error('Error fetching profile', error);
    throw error;
  }

  return data;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading } = useQuery({
    queryKey: profileKeys.detail(user?.id ?? ''),
    queryFn: () => fetchProfileById(user!.id),
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        // Profile allows a null first_name for display, but the column is
        // NOT NULL — callers never clear it, so narrow to the table's type.
        .update(updates as TablesUpdate<'profiles'>)
        .eq('id', user!.id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.detail(user!.id), data);
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      log.error('Error updating profile', error);
      toast.error('Failed to update profile');
    },
  });

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) return null;
      try {
        return await updateMutation.mutateAsync(updates);
      } catch {
        return null;
      }
    },
    [user, updateMutation]
  );

  const fetchProfileByIdCb = useCallback(
    async (profileId: string): Promise<Profile | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: profileKeys.detail(profileId),
          queryFn: () => fetchProfileById(profileId),
          staleTime: 60000,
        });
      } catch (error) {
        log.error('Error fetching profile by id', error);
        toast.error('Failed to load profile');
        return null;
      }
    },
    [queryClient]
  );

  return {
    profile,
    isLoading,
    updateProfile,
    fetchProfileById: fetchProfileByIdCb,
  };
};
