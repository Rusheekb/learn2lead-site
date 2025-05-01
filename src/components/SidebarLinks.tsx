
import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, User, Settings } from 'lucide-react';
import { AppRole } from '@/types/profile';

interface SidebarLinksProps {
  role: AppRole;
  expanded: boolean;
}

const SidebarLinks: React.FC<SidebarLinksProps> = ({ role, expanded }) => {
  const baseClasses =
    'flex items-center px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200';
  const expandedClasses = expanded ? 'justify-start' : 'justify-center';

  return (
    <nav className="space-y-1">
      {role === 'student' && (
        <>
          <Link to="/dashboard" className={`${baseClasses} ${expandedClasses}`}>
            <LayoutDashboard className="h-5 w-5" />
            {expanded && <span className="ml-3">Dashboard</span>}
          </Link>
          <Link to="/profile" className={`${baseClasses} ${expandedClasses}`}>
            <User className="h-5 w-5" />
            {expanded && <span className="ml-3">Profile</span>}
          </Link>
        </>
      )}

      {role === 'tutor' && (
        <>
          <Link
            to="/tutor-dashboard"
            className={`${baseClasses} ${expandedClasses}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            {expanded && <span className="ml-3">Dashboard</span>}
          </Link>
          <Link
            to="/tutor-profile"
            className={`${baseClasses} ${expandedClasses}`}
          >
            <User className="h-5 w-5" />
            {expanded && <span className="ml-3">Profile</span>}
          </Link>
        </>
      )}

      {role === 'admin' && (
        <Link
          to="/admin-dashboard"
          className={`${baseClasses} ${expandedClasses}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          {expanded && <span className="ml-3">Dashboard</span>}
        </Link>
      )}
    </nav>
  );
};

export default SidebarLinks;
