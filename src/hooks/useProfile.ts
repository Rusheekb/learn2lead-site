import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const log = logger.create('useProfile');

export type AppRole = 'student' | 'tutor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  bio: string | null;
  avatar_url: string | null;
  zoom_link: string | null;
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
    mutationFn: (updates: Partial<Profile>) =>
      supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data as Profile;
        }),
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
