
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, Calendar, Book, LogOut } from 'lucide-react';
import { AppRole } from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';
import NotificationBell from './NotificationBell';

interface AppSidebarProps {
  className?: string;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ className = '' }) => {
  const { userRole, signOut } = useAuth();
  const { isExpanded, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  
  if (!userRole) return null;
  
  const baseClasses =
    'flex items-center px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-tutoring-blue dark:focus:ring-tutoring-teal';
  const expandedClasses = isExpanded ? 'justify-start' : 'justify-center';
  
  // Function to get active class for NavLink
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return isActive 
      ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
      : `${baseClasses} ${expandedClasses}`;
  };

  // Get appropriate dashboard path based on role
  const getDashboardPath = () => {
    switch (userRole) {
      case 'student':
        return '/dashboard';
      case 'tutor':
        return '/tutor-dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/';
    }
  };
  
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
  
  // Role-specific navigation items
  const renderNavLinks = () => {
    const dashboardPath = getDashboardPath();
    const profilePath = getProfilePath();
    
    switch (userRole) {
      case 'student':
        return (
          <nav className="space-y-1" aria-label="Student navigation">
            <NavLink to="/dashboard" className={getNavLinkClass} end aria-label="Dashboard">
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">Dashboard</span>}
            </NavLink>
            <NavLink to="/dashboard?tab=schedule" className={getNavLinkClass} aria-label="My Schedule">
              <Calendar className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">My Schedule</span>}
            </NavLink>
            <NavLink to="/dashboard?tab=resources" className={getNavLinkClass} aria-label="Resources">
              <Book className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">Resources</span>}
            </NavLink>
            <NavLink to={profilePath} className={getNavLinkClass} aria-label="Profile">
              <User className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">Profile</span>}
            </NavLink>
          </nav>
        );
      case 'tutor':
        return (
          <nav className="space-y-1" aria-label="Tutor navigation">
            <NavLink to="/tutor-dashboard" className={getNavLinkClass} end aria-label="Dashboard">
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">Dashboard</span>}
            </NavLink>
            <NavLink to="/tutor-dashboard?tab=schedule" className={getNavLinkClass} aria-label="My Schedule">
              <Calendar className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">My Schedule</span>}
            </NavLink>
            <NavLink to="/tutor-dashboard?tab=resources" className={getNavLinkClass} aria-label="Resources">
              <Book className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">Resources</span>}
            </NavLink>
            <NavLink to={profilePath} className={getNavLinkClass} aria-label="Profile">
              <User className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">Profile</span>}
            </NavLink>
          </nav>
        );
      case 'admin':
        return (
          <nav className="space-y-1" aria-label="Admin navigation">
            <NavLink to="/admin-dashboard" className={getNavLinkClass} aria-label="Dashboard">
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">Dashboard</span>}
            </NavLink>
            <NavLink to={profilePath} className={getNavLinkClass} aria-label="Profile">
              <User className="h-5 w-5" aria-hidden="true" />
              {isExpanded && <span className="ml-3">Profile</span>}
            </NavLink>
          </nav>
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
      <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
        <Link
          to="/"
          className={`${
            !isExpanded ? 'justify-center' : ''
          } flex items-center text-xl font-bold text-tutoring-blue dark:text-tutoring-teal`}
          aria-label="Go to homepage"
        >
          {isExpanded ? (
            <>
              Learn<span className="text-tutoring-teal dark:text-tutoring-blue">2</span>Lead
            </>
          ) : (
            'L2L'
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 md:block hidden focus:outline-none focus:ring-2 focus:ring-tutoring-blue dark:focus:ring-tutoring-teal rounded-md"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex-grow p-4">
        {renderNavLinks()}
      </div>

      {/* Footer with logout and notification bell */}
      <div className="p-4 border-t dark:border-gray-700 mt-auto">
        <div className="flex items-center justify-between mb-2">
          <NotificationBell />
          {isExpanded && <span className="text-sm text-gray-600 dark:text-gray-400">Notifications</span>}
        </div>
        
        {/* Logout button */}
        <button
          onClick={signOut}
          className={`${
            isExpanded
              ? 'flex items-center w-full'
              : 'flex justify-center w-full'
          } px-4 py-2 mt-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-tutoring-blue dark:focus:ring-tutoring-teal`}
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          {isExpanded && <span className="ml-2">Logout</span>}
          <span className="sr-only">Logout from application</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
