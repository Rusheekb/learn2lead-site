
import React from 'react';
import { Profile } from '@/hooks/useProfile';
import ContentShareContainer from './content-share/ContentShareContainer';

interface ContentShareProps {
  role: 'student' | 'tutor' | 'admin';
  fetchUsers: () => Promise<Profile[]>;
}

const ContentShare: React.FC<ContentShareProps> = ({ role, fetchUsers }) => {
  return <ContentShareContainer role={role} fetchUsers={fetchUsers} />;
};

export default ContentShare;
