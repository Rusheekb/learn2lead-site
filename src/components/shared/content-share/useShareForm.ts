
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useShareForm = (userId: string | undefined, loadShares: () => Promise<void>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedUser || !formData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    try {
      let filePath = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${userId}-${fileExt}`;
        const path = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('shared_content')
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('shared_content')
          .getPublicUrl(path);

        filePath = data.publicUrl;
      }

      const { error } = await supabase.from('content_shares').insert({
        sender_id: userId,
        receiver_id: selectedUser,
        title: formData.title,
        description: formData.description || null,
        file_path: filePath,
        content_type: file?.type || null,
      });

      if (error) throw error;

      toast.success('Content shared successfully');
      setIsOpen(false);
      setFormData({ title: '', description: '' });
      setFile(null);
      setSelectedUser('');
      loadShares();
    } catch (error) {
      console.error('Error sharing content:', error);
      toast.error('Failed to share content');
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    selectedUser,
    setSelectedUser,
    formData,
    setFormData,
    file,
    setFile,
    isUploading,
    handleShare
  };
};
