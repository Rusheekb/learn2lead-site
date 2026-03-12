
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Profile } from '@/hooks/useProfile';
import { profileSchema, validateForm } from '@/lib/validation';

interface ProfileFormProps {
  formData: {
    first_name: string;
    last_name: string;
    bio: string;
    zoom_link: string;
  };
  profile: Profile;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors?: Record<string, string>;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  formData,
  profile,
  handleInputChange,
  errors = {},
}) => {
  const fieldError = (name: string) =>
    errors[name] ? (
      <p className="mt-1 text-sm text-destructive" role="alert">
        {errors[name]}
      </p>
    ) : null;

  const inputClass = (name: string) =>
    errors[name] ? 'border-destructive focus-visible:ring-destructive' : '';

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
          className={inputClass('first_name')}
          aria-invalid={!!errors.first_name}
        />
        {fieldError('first_name')}
      </div>

      <div>
        <Label htmlFor="last_name">Last Name</Label>
        <Input
          id="last_name"
          name="last_name"
          value={formData.last_name}
          onChange={handleInputChange}
          placeholder="Last Name"
          className={inputClass('last_name')}
          aria-invalid={!!errors.last_name}
        />
        {fieldError('last_name')}
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder="Tell us about yourself..."
          className={`resize-none h-32 ${inputClass('bio')}`}
          aria-invalid={!!errors.bio}
        />
        {fieldError('bio')}
      </div>

      {profile.role === 'tutor' && (
        <div>
          <Label htmlFor="zoom_link">Zoom Meeting Link</Label>
          <Input
            id="zoom_link"
            name="zoom_link"
            value={formData.zoom_link}
            onChange={handleInputChange}
            placeholder="https://zoom.us/j/your-meeting-id"
            type="url"
            className={inputClass('zoom_link')}
            aria-invalid={!!errors.zoom_link}
          />
          {fieldError('zoom_link')}
          <p className="text-sm text-muted-foreground mt-1">
            This link will auto-fill when you schedule new classes
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={profile.email} disabled className="bg-muted" aria-describedby="email-hint" />
        <p id="email-hint" className="text-sm text-muted-foreground mt-1">
          Email cannot be changed
        </p>
      </div>

      <div>
        <Label htmlFor="profile-role">Role</Label>
        <Input
          id="profile-role"
          value={
            profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
          }
          disabled
          className="bg-muted"
          aria-describedby="role-hint"
        />
        <p id="role-hint" className="text-sm text-muted-foreground mt-1">
          Role is assigned by admin
        </p>
      </div>
    </div>
  );
};

export default ProfileForm;
