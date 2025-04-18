
import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      // Don't refetch if we already have the profile for this user
      if (profile && profile.id === user.id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          toast.error("Failed to load profile");
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error("Error in profile fetch:", error);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

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
    try {
      // Use a cached result if we're requesting the current user's profile
      if (profile && profile.id === profileId) return profile;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        console.error("Error fetching profile by ID:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in profile fetch by ID:", error);
      return null;
    }
  };

  return {
    profile,
    isLoading,
    updateProfile,
    fetchProfileById
  };
};
