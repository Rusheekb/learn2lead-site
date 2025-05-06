
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, FileText, LayoutDashboard, Settings, User, UserRound, Users, UsersRound } from 'lucide-react';

interface AdminNavLinksProps {
  isExpanded: boolean;
  baseClasses: string;
  expandedClasses: string;
  profilePath: string;
}

const AdminNavLinks: React.FC<AdminNavLinksProps> = ({ 
  isExpanded, 
  baseClasses, 
  expandedClasses, 
  profilePath 
}) => {
  const location = useLocation();
  
  return (
    <nav className="space-y-1" aria-label="Admin navigation">
      <NavLink 
        to="/admin-dashboard?tab=analytics" 
        className={({ isActive }) => 
          isActive || location.pathname === '/admin-dashboard' 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Analytics"
      >
        <BarChart3 className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Analytics</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=schedule" 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Class Logs"
      >
        <FileText className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Class Logs</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=payments" 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Payments"
      >
        <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Payments</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=tutors" 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Tutors"
      >
        <UserRound className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Tutors</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=students" 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Students"
      >
        <Users className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Students</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=relationships" 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Relationships"
      >
        <UsersRound className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Relationships</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=settings" 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Settings</span>}
      </NavLink>
      <NavLink 
        to={profilePath} 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Profile"
      >
        <User className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Profile</span>}
      </NavLink>
    </nav>
  );
};

export default AdminNavLinks;
