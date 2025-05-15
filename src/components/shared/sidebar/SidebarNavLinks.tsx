
import React from 'react';
import { AppRole } from '@/types/profile';
import StudentNavLinks from './StudentNavLinks';
import TutorNavLinks from './TutorNavLinks';
import AdminNavLinks from './AdminNavLinks';

interface SidebarNavLinksProps {
  userRole: AppRole;
  isExpanded: boolean;
  profilePath: string;
}

const SidebarNavLinks: React.FC<SidebarNavLinksProps> = ({
  userRole,
  isExpanded,
  profilePath
}) => {
  // Role-specific navigation items
  switch (userRole) {
    case 'student':
      return (
        <StudentNavLinks 
          isExpanded={isExpanded}
          profilePath={profilePath}
        />
      );
    case 'tutor':
      return (
        <TutorNavLinks 
          isExpanded={isExpanded}
          profilePath={profilePath}
        />
      );
    case 'admin':
      return (
        <AdminNavLinks 
          isExpanded={isExpanded}
          profilePath={profilePath}
        />
      );
    default:
      return null;
  }
};

export default SidebarNavLinks;
