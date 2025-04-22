import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AppRole = 'student' | 'tutor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const profileCache = new Map<string, Profile>();

  const fetchProfile = useCallback(async (userId: string) => {
    if (profileCache.has(userId)) {
      const cachedProfile = profileCache.get(userId);
      if (cachedProfile) {
        setProfile(cachedProfile);
        return cachedProfile;
      }
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
        setIsLoading(false);
        return null;
      }

      profileCache.set(userId, data);
      setProfile(data);
      setIsLoading(false);
      return data;
    } catch (error) {
      console.error("Error in profile fetch:", error);
      toast.error("Failed to load profile");
      setIsLoading(false);
      return null;
    }
  }, [toast, profileCache]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    fetchProfile(user.id);
  }, [user, fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        toast.error("Failed to update profile");
        console.error("Error updating profile:", error);
        return null;
      }

      profileCache.set(user.id, data);
      setProfile(data);
      toast.success("Profile updated successfully");
      return data;
    } catch (error) {
      console.error("Error in profile update:", error);
      toast.error("Failed to update profile");
      return null;
    }
  };

  const fetchProfileById = async (profileId: string): Promise<Profile | null> => {
    return fetchProfile(profileId);
  };

  return {
    profile,
    isLoading,
    updateProfile,
    fetchProfileById
  };
};
