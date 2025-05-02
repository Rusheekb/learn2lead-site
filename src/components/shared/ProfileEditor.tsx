
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import AvatarUploader from './profile/AvatarUploader';
import ProfileForm from './profile/ProfileForm';

interface ProfileEditorProps {
  profile: Profile;
  onSave: (profile: Partial<Profile>) => Promise<Profile | null>;
  onCancel?: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    bio: profile.bio || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.editProfile')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AvatarUploader profile={profile} onSave={onSave} />
          <ProfileForm 
            formData={formData}
            profile={profile}
            handleInputChange={handleInputChange}
          />
        </form>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? t('profile.saving') : t('profile.saveChanges')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProfileEditor;
