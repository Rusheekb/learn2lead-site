import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile } from '@/hooks/useProfile';
import ProfileDisplay from './ProfileDisplay';
import SettingsTab from './SettingsTab';
import PreferencesForm from './PreferencesForm';
import { ContentTransition } from '@/components/shared/PageTransition';

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
  // Preferences tab: students and tutors only
  const showPreferences =
    profile.role === 'student' || profile.role === 'tutor';
  // Settings subtab: admins have a dedicated top-level Settings page, so hide it here
  const showSettings = profile.role !== 'admin';

  const colCount = showPreferences ? 3 : showSettings ? 2 : 1;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className={`grid w-full grid-cols-${colCount}`}>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        {showPreferences && (
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        )}
        {showSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
      </TabsList>

      <TabsContent value="profile" className="pt-6">
        <ContentTransition transitionKey={activeTab}>
          <ProfileDisplay
            profile={profile}
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            updateProfile={updateProfile}
          />
        </ContentTransition>
      </TabsContent>

      {showPreferences && (
        <TabsContent value="preferences" className="pt-6">
          <ContentTransition transitionKey={activeTab}>
            <PreferencesForm
              role={profile.role as 'student' | 'tutor'}
              userEmail={profile.email}
            />
          </ContentTransition>
        </TabsContent>
      )}

      {showSettings && (
        <TabsContent value="settings" className="pt-6">
          <ContentTransition transitionKey={activeTab}>
            <SettingsTab profile={profile} updateProfile={updateProfile} />
          </ContentTransition>
        </TabsContent>
      )}
    </Tabs>
  );
};

export default ProfileTabs;
