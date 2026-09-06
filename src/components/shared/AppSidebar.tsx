import React from 'react';
import { AppRole } from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import SidebarLogo from './sidebar/SidebarLogo';
import SidebarFooter from './sidebar/SidebarFooter';
import SidebarNavLinks from './sidebar/SidebarNavLinks';

interface AppSidebarProps {
  className?: string;
  // Mobile's drawer is a temporary overlay, not a persistent rail — the
  // desktop icon-only "collapsed" state doesn't make sense there, and the
  // toggle to undo it is desktop-only (see SidebarLogo), so a mobile user
  // whose stored preference happened to be collapsed would otherwise have
  // no way back to a usable sidebar. Callers rendering this inside a mobile
  // drawer should force full-expanded rendering regardless of that stored
  // preference.
  forceExpanded?: boolean;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  className = '',
  forceExpanded = false,
}) => {
  const { userRole, signOut } = useAuth();
  const { isExpanded: storedExpanded, toggleSidebar } = useSidebar();
  const isExpanded = forceExpanded || storedExpanded;

  if (!userRole) return null;

  const getProfilePath = () => {
    switch (userRole) {
      case 'student':
        return '/profile';
      case 'tutor':
        return '/tutor-profile';
      case 'admin':
        return '/admin-profile';
      default:
        return '/';
    }
  };

  return (
    <aside
      className={`${
        isExpanded ? 'w-56' : 'w-[60px]'
      } transition-all duration-200 ease-in-out bg-gray-50 border-r border-border h-full overflow-auto flex flex-col z-30 ${className}`}
      aria-label="Dashboard sidebar"
    >
      <SidebarLogo isExpanded={isExpanded} toggleSidebar={toggleSidebar} />

      <div className="flex-grow px-2 py-3">
        <SidebarNavLinks
          userRole={userRole}
          isExpanded={isExpanded}
          profilePath={getProfilePath()}
        />
      </div>

      <SidebarFooter isExpanded={isExpanded} signOut={signOut} />
    </aside>
  );
};

export default AppSidebar;
