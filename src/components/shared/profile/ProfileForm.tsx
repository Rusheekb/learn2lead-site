
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="first_name">{t('profile.firstName')}</Label>
        <Input
          id="first_name"
          name="first_name"
          value={formData.first_name}
          onChange={handleInputChange}
          placeholder={String(t('profile.firstName'))}
        />
      </div>

      <div>
        <Label htmlFor="last_name">{t('profile.lastName')}</Label>
        <Input
          id="last_name"
          name="last_name"
          value={formData.last_name}
          onChange={handleInputChange}
          placeholder={String(t('profile.lastName'))}
        />
      </div>

      <div>
        <Label htmlFor="bio">{t('profile.bio')}</Label>
        <Textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder={String(t('profile.bio'))}
          className="resize-none h-32"
        />
      </div>

      <div>
        <Label>{t('auth.email')}</Label>
        <Input value={profile.email} disabled className="bg-gray-100" />
        <p className="text-sm text-gray-500 mt-1">
          {t('profile.emailCannotBeChanged')}
        </p>
      </div>

      <div>
        <Label>{t('profile.role')}</Label>
        <Input
          value={
            profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
          }
          disabled
          className="bg-gray-100"
        />
        <p className="text-sm text-gray-500 mt-1">
          {t('profile.roleAssignedByAdmin')}
        </p>
      </div>
    </div>
  );
};

export default ProfileForm;
