
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile } from '@/hooks/useProfile';
import ProfileDisplay from './ProfileDisplay';
import SharedContentTab from './SharedContentTab';

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
  const { t } = useTranslation();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile">{t('profile.myProfile')}</TabsTrigger>
        <TabsTrigger value="shared">{t('profile.sharedContent')}</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="pt-6">
        <ProfileDisplay 
          profile={profile}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          updateProfile={updateProfile}
        />
      </TabsContent>

      <TabsContent value="shared" className="pt-6">
        <SharedContentTab 
          role={profile.role} 
          fetchUsers={fetchRelevantUsers} 
        />
      </TabsContent>
    </Tabs>
  );
};

export default ProfileTabs;
