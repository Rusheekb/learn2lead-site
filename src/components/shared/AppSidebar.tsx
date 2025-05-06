
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRole } from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import { getDashboardPath } from '@/utils/authNavigation';
import SidebarLogo from './sidebar/SidebarLogo';
import SidebarFooter from './sidebar/SidebarFooter';
import StudentNavLinks from './sidebar/StudentNavLinks';
import TutorNavLinks from './sidebar/TutorNavLinks';
import AdminNavLinks from './sidebar/AdminNavLinks';

interface AppSidebarProps {
  className?: string;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ className = '' }) => {
  const { userRole, signOut } = useAuth();
  const { isExpanded, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  
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
  
  // Role-specific navigation items
  const renderNavLinks = () => {
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

  return (
    <aside 
      className={`${
        isExpanded ? 'w-64' : 'w-20'
      } transition-all duration-300 ease-in-out bg-gray-100 dark:bg-gray-800 shadow-md h-screen overflow-auto flex flex-col z-30 ${className}`}
      aria-label="Dashboard sidebar"
    >
      <SidebarLogo isExpanded={isExpanded} toggleSidebar={toggleSidebar} />

      <div className="flex-grow p-4">
        {renderNavLinks()}
      </div>

      <SidebarFooter isExpanded={isExpanded} signOut={signOut} />
    </aside>
  );
};

export default AppSidebar;
