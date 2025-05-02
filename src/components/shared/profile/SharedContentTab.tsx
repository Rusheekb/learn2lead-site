
import React from 'react';
import ContentShare from '../ContentShare';
import { Profile } from '@/hooks/useProfile';
import { AppRole } from '@/types/profile';

interface SharedContentTabProps {
  role: AppRole;
  fetchUsers: () => Promise<Profile[]>;
}

const SharedContentTab: React.FC<SharedContentTabProps> = ({ role, fetchUsers }) => {
  return <ContentShare role={role} fetchUsers={fetchUsers} />;
};

export default SharedContentTab;
