
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile } from '@/hooks/useProfile';
import ProfileDisplay from './ProfileDisplay';
import SettingsTab from './SettingsTab';
import PreferencesForm from './PreferencesForm';

interface ProfileTabsProps {
  profile: Profile;
  activeTab: string;
  setActiveTab: (value: string) => void;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
  fetchRelevantUsers: () => Promise<Profile[]>;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  profile,
  activeTab,
  setActiveTab,
  isEditMode,
  setIsEditMode,
  updateProfile,
  fetchRelevantUsers,
}) => {
  // Only show preferences tab for students and tutors, not admins
  const showPreferences = profile.role === 'student' || profile.role === 'tutor';

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className={`grid w-full ${showPreferences ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        {showPreferences && (
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        )}
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="pt-6">
        <ProfileDisplay 
          profile={profile}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          updateProfile={updateProfile}
        />
      </TabsContent>

      {showPreferences && (
        <TabsContent value="preferences" className="pt-6">
          <PreferencesForm 
            role={profile.role as 'student' | 'tutor'}
            userEmail={profile.email}
          />
        </TabsContent>
      )}

      <TabsContent value="settings" className="pt-6">
        <SettingsTab 
          profile={profile}
          updateProfile={updateProfile}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ProfileTabs;
