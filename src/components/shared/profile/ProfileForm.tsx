
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Profile } from '@/hooks/useProfile';

interface ProfileFormProps {
  formData: {
    first_name: string;
    last_name: string;
    bio: string;
  };
  profile: Profile;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  formData,
  profile,
  handleInputChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="first_name">First Name</Label>
        <Input
          id="first_name"
          name="first_name"
          value={formData.first_name}
          onChange={handleInputChange}
          placeholder="First Name"
        />
      </div>

      <div>
        <Label htmlFor="last_name">Last Name</Label>
        <Input
          id="last_name"
          name="last_name"
          value={formData.last_name}
          onChange={handleInputChange}
          placeholder="Last Name"
        />
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder="Tell us about yourself..."
          className="resize-none h-32"
        />
      </div>

      <div>
        <Label>Email</Label>
        <Input value={profile.email} disabled className="bg-gray-100" />
        <p className="text-sm text-gray-500 mt-1">
          Email cannot be changed
        </p>
      </div>

      <div>
        <Label>Role</Label>
        <Input
          value={
            profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
          }
          disabled
          className="bg-gray-100"
        />
        <p className="text-sm text-gray-500 mt-1">
          Role is assigned by admin
        </p>
      </div>
    </div>
  );
};

export default ProfileForm;
