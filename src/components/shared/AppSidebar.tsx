
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRole } from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import { getDashboardPath } from '@/utils/authNavigation';
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
  
  // Get appropriate profile path based on role
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
  
  const profilePath = getProfilePath();

  return (
    <aside 
      className={`${
        isExpanded ? 'w-64' : 'w-20'
      } transition-all duration-300 ease-in-out bg-gray-100 shadow-md h-full overflow-auto flex flex-col z-30 ${className}`}
      aria-label="Dashboard sidebar"
    >
      <SidebarLogo isExpanded={isExpanded} toggleSidebar={toggleSidebar} />

      <div className="flex-grow p-4">
        <SidebarNavLinks 
          userRole={userRole} 
          isExpanded={isExpanded} 
          profilePath={profilePath} 
        />
      </div>

      <SidebarFooter isExpanded={isExpanded} signOut={signOut} />
    </aside>
  );
};

export default AppSidebar;
