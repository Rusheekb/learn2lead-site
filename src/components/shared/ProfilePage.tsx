
import React, { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProfileTabs from './profile/ProfileTabs';
import LoadingState from './profile/LoadingState';
import ProfileNotFound from './profile/ProfileNotFound';

const ProfilePage: React.FC = () => {
  const { profile, isLoading, updateProfile } = useProfile();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Function to fetch users for content sharing - fetches tutors for students and vice versa
  const fetchRelevantUsers = async () => {
    if (!profile) return [];

    setLoadingUsers(true);
    try {
      let query = supabase.from('profiles').select('*');

      // Filter users based on role
      if (profile.role === 'student') {
        // Students see tutors
        query = query.eq('role', 'tutor');
      } else if (profile.role === 'tutor') {
        // Tutors see students
        query = query.eq('role', 'student');
      }

      const { data, error } = await query;

      if (error) {
        toast.error('Failed to load users');
        console.error('Error loading users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchRelevantUsers:', error);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!profile) {
    return <ProfileNotFound />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Profile</h2>

      <ProfileTabs
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        updateProfile={updateProfile}
        fetchRelevantUsers={fetchRelevantUsers}
      />
    </div>
  );
};

export default ProfilePage;
