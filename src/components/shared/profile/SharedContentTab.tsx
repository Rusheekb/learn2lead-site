import React from 'react';
import ContentShareContainer from '../content-share/ContentShareContainer';
import { Profile } from '@/hooks/useProfile';
import { AppRole } from '@/types/profile';

interface SharedContentTabProps {
  role: AppRole;
  fetchUsers: () => Promise<Profile[]>;
}

const SharedContentTab: React.FC<SharedContentTabProps> = ({ role, fetchUsers }) => {
  return <ContentShareContainer role={role} fetchUsers={fetchUsers} />;
};

export default SharedContentTab;
