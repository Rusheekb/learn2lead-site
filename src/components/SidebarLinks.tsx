
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, User, Calendar, Book } from 'lucide-react';
import { AppRole } from '@/types/profile';

interface SidebarLinksProps {
  role: AppRole;
  expanded: boolean;
}

const SidebarLinks: React.FC<SidebarLinksProps> = ({ role, expanded }) => {
  const baseClasses =
    'flex items-center px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200';
  const expandedClasses = expanded ? 'justify-start' : 'justify-center';
  
  // Function to get active class for NavLink
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return isActive 
      ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
      : `${baseClasses} ${expandedClasses}`;
  };

  return (
    <nav className="space-y-1">
      {role === 'student' && (
        <>
          <NavLink to="/dashboard" className={getNavLinkClass} end>
            <LayoutDashboard className="h-5 w-5" />
            {expanded && <span className="ml-3">Dashboard</span>}
          </NavLink>
          <NavLink to="/dashboard?tab=schedule" className={getNavLinkClass}>
            <Calendar className="h-5 w-5" />
            {expanded && <span className="ml-3">My Schedule</span>}
          </NavLink>
          <NavLink to="/dashboard?tab=resources" className={getNavLinkClass}>
            <Book className="h-5 w-5" />
            {expanded && <span className="ml-3">Resources</span>}
          </NavLink>
          <NavLink to="/profile" className={getNavLinkClass}>
            <User className="h-5 w-5" />
            {expanded && <span className="ml-3">Profile</span>}
          </NavLink>
        </>
      )}

      {role === 'tutor' && (
        <>
          <NavLink
            to="/tutor-dashboard"
            className={getNavLinkClass}
            end
          >
            <LayoutDashboard className="h-5 w-5" />
            {expanded && <span className="ml-3">Dashboard</span>}
          </NavLink>
          <NavLink
            to="/tutor-dashboard?tab=schedule"
            className={getNavLinkClass}
          >
            <Calendar className="h-5 w-5" />
            {expanded && <span className="ml-3">My Schedule</span>}
          </NavLink>
          <NavLink
            to="/tutor-dashboard?tab=resources"
            className={getNavLinkClass}
          >
            <Book className="h-5 w-5" />
            {expanded && <span className="ml-3">Resources</span>}
          </NavLink>
          <NavLink
            to="/tutor-profile"
            className={getNavLinkClass}
          >
            <User className="h-5 w-5" />
            {expanded && <span className="ml-3">Profile</span>}
          </NavLink>
        </>
      )}

      {role === 'admin' && (
        <NavLink
          to="/admin-dashboard"
          className={getNavLinkClass}
        >
          <LayoutDashboard className="h-5 w-5" />
          {expanded && <span className="ml-3">Dashboard</span>}
        </NavLink>
      )}
    </nav>
  );
};

export default SidebarLinks;
