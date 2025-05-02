
import React from 'react';
import { Profile } from '@/hooks/useProfile';
import ContentShareContainer from './content-share/ContentShareContainer';
import { AppRole } from '@/types/profile';

interface ContentShareProps {
  role: AppRole;
  fetchUsers: () => Promise<Profile[]>;
}

const ContentShare: React.FC<ContentShareProps> = ({ role, fetchUsers }) => {
  return <ContentShareContainer role={role} fetchUsers={fetchUsers} />;
};

export default ContentShare;
