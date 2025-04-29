
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Profile } from '@/hooks/useProfile';
import ShareDialog from './share/ShareDialog';
import ShareTable from './share/ShareTable';
import SharesEmptyState from './share/SharesEmptyState';
import { ContentShareItem } from '@/types/sharedTypes';

interface ContentShareProps {
  role: 'student' | 'tutor' | 'admin';
  fetchUsers: () => Promise<Profile[]>;
}

const ContentShare: React.FC<ContentShareProps> = ({ role, fetchUsers }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [shares, setShares] = useState<ContentShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadShares = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        setShares([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('content_shares')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching shares:', error);
        toast.error('Failed to load shared content');
      } else {
        setShares(data || []);
      }
    } catch (error) {
      console.error('Error in loadShares:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadUsers = useCallback(async () => {
    try {
      const loadedUsers = await fetchUsers();
      setUsers(loadedUsers.filter((u) => u.id !== user?.id));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  }, [fetchUsers, user]);

  useEffect(() => {
    if (user) {
      loadShares();
      loadUsers();
    }
  }, [user, loadShares, loadUsers]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !formData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    try {
      let filePath = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${user.id}-${fileExt}`;
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
        sender_id: user.id,
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

  const handleDownload = (filePath: string | null) => {
    if (filePath) {
      window.open(filePath, '_blank');
    }
  };

  const markAsViewed = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('content_shares')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', shareId)
        .eq('receiver_id', user?.id || '');

      if (error) throw error;

      loadShares();
    } catch (error) {
      console.error('Error marking as viewed:', error);
      toast.error('Failed to update view status');
    }
  };

  const getUserName = (userId: string) => {
    const userProfile = users.find((u) => u.id === userId);
    if (!userProfile) return 'Unknown User';
    return userProfile.first_name && userProfile.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : userProfile.email.split('@')[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shared Content</h2>
        <Button onClick={() => setIsOpen(true)}>
          <FileUp className="h-4 w-4 mr-1" /> Share Content
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <p>Loading shared content...</p>
        </div>
      ) : shares.length > 0 ? (
        <ShareTable
          shares={shares}
          user={user}
          handleDownload={handleDownload}
          markAsViewed={markAsViewed}
          getUserName={getUserName}
        />
      ) : (
        <SharesEmptyState role={role} />
      )}

      <ShareDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        users={users}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        formData={formData}
        setFormData={setFormData}
        file={file}
        setFile={setFile}
        handleShare={handleShare}
        isUploading={isUploading}
      />
    </div>
  );
};

export default ContentShare;
