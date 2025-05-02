
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/hooks/useProfile';
import ShareActions from './ShareActions';
import ShareDialog from '../share/ShareDialog';
import ShareTable from '../share/ShareTable';
import SharesEmptyState from '../share/SharesEmptyState';
import { useContentShareData } from './useContentShareData';
import { useShareForm } from './useShareForm';

interface ContentShareContainerProps {
  role: 'student' | 'tutor' | 'admin';
  fetchUsers: () => Promise<Profile[]>;
}

const ContentShareContainer: React.FC<ContentShareContainerProps> = ({ role, fetchUsers }) => {
  const { user } = useAuth();
  
  const {
    shares,
    isLoading,
    users,
    loadShares,
    handleDownload,
    markAsViewed,
    getUserName
  } = useContentShareData(user?.id, fetchUsers);
  
  const {
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
  } = useShareForm(user?.id, loadShares);
  
  return (
    <div className="space-y-6">
      <ShareActions openShareDialog={() => setIsOpen(true)} />

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

export default ContentShareContainer;
