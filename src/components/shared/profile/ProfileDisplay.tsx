
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
    <div className="space-y-6">
      <ProfileView profile={profile} />
      
      <div className="flex justify-end">
        <button
          onClick={() => setIsEditMode(true)}
          className="text-tutoring-blue hover:text-tutoring-blue/80 dark:text-tutoring-teal dark:hover:text-tutoring-teal/80"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
};

export default ProfileDisplay;
