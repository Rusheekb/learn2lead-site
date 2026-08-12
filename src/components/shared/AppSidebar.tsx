import React from 'react';
import { AppRole } from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import SidebarLogo from './sidebar/SidebarLogo';
import SidebarFooter from './sidebar/SidebarFooter';
import SidebarNavLinks from './sidebar/SidebarNavLinks';

interface AppSidebarProps {
  className?: string;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ className = '' }) => {
  const { userRole, signOut } = useAuth();
  const { isExpanded, toggleSidebar } = useSidebar();

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
