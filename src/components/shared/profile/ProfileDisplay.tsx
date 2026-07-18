import React from 'react';
import { Profile } from '@/hooks/useProfile';
import ProfileEditor from '../ProfileEditor';
import ProfileView from '../ProfileView';

interface ProfileDisplayProps {
  profile: Profile;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  profile,
  isEditMode,
  setIsEditMode,
  updateProfile,
}) => {
  return isEditMode ? (
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
    <ProfileView profile={profile} onEdit={() => setIsEditMode(true)} />
  );
};

export default ProfileDisplay;
