
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Profile } from '@/hooks/useProfile';

interface AvatarUploaderProps {
  profile: Profile;
  onSave: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ profile, onSave }) => {
  const [isUploading, setIsUploading] = useState(false);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    let initials = '';
    if (firstName) initials += firstName[0];
    if (lastName) initials += lastName[0];
    return initials || profile.email.substring(0, 2).toUpperCase();
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}-${Date.now()}.${fileExt}`;

    setIsUploading(true);

    try {
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update the user's profile with the avatar URL
      await onSave({ avatar_url: data.publicUrl });

      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <Avatar className="w-24 h-24">
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className="bg-tutoring-blue text-white text-xl">
          {getInitials(profile.first_name, profile.last_name)}
        </AvatarFallback>
      </Avatar>

      <div>
        <Label
          htmlFor="avatar"
          className="cursor-pointer px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200"
        >
          {isUploading ? 'Uploading...' : 'Change Avatar'}
        </Label>
        <Input
          id="avatar"
          type="file"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={isUploading}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default AvatarUploader;
