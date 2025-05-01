
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/hooks/useProfile';
import ProfileEditor from './ProfileEditor';
import ProfileView from './ProfileView';
import ContentShare from './ContentShare';
import ThemeToggle from './ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

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
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 border rounded-md">
        <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Profile not found</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Please sign in to view your profile
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Profile</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="shared">Shared Content</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-6">
          {isEditMode ? (
            <ProfileEditor
              profile={profile}
              onSave={async (updates) => {
                const result = await updateProfile(updates);
                if (result) setIsEditMode(false);
                return result;
              }}
              onCancel={() => setIsEditMode(false)}
            />
          ) : (
            <div className="space-y-6">
              <ProfileView profile={profile} />
              
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Appearance</h3>
                  <ThemeToggle />
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setIsEditMode(true)}
                  className="text-tutoring-blue hover:text-tutoring-blue/80 dark:text-tutoring-teal dark:hover:text-tutoring-teal/80"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared" className="pt-6">
          <ContentShare role={profile.role} fetchUsers={fetchRelevantUsers} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
