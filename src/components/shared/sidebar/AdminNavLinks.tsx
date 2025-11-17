
import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, CreditCard, FileText, LayoutDashboard, Settings, User, UserRound, Users, UsersRound } from 'lucide-react';
import { useSidebarStyles } from './useSidebarStyles';

interface AdminNavLinksProps {
  isExpanded: boolean;
  profilePath: string;
}

const AdminNavLinks: React.FC<AdminNavLinksProps> = ({ 
  isExpanded, 
  profilePath 
}) => {
  const { baseClasses, activeClasses, isLinkActive } = useSidebarStyles();
  const expandedClasses = isExpanded ? 'justify-start' : 'justify-center';
  
  return (
    <nav className="space-y-1" aria-label="Admin navigation">
      <NavLink 
        to="/admin-dashboard?tab=schedule"
        className={() => 
          isLinkActive('/admin-dashboard', { key: 'tab', value: 'schedule' })
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Class Logs"
      >
        <FileText className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Class Logs</span>}
      </NavLink>
      <NavLink
        to="/admin-dashboard?tab=credits" 
        className={() => 
          isLinkActive('/admin-dashboard', { key: 'tab', value: 'credits' })
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Credits"
      >
        <CreditCard className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Credits</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=tutors"
        className={() => 
          isLinkActive('/admin-dashboard', { key: 'tab', value: 'tutors' })
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Tutors"
      >
        <UserRound className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Tutors</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=students" 
        className={() => 
          isLinkActive('/admin-dashboard', { key: 'tab', value: 'students' })
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Students"
      >
        <Users className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Students</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=assignments" 
        className={() => 
          isLinkActive('/admin-dashboard', { key: 'tab', value: 'assignments' })
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Assignments"
      >
        <UsersRound className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Assignments</span>}
      </NavLink>
      <NavLink 
        to="/admin-dashboard?tab=settings" 
        className={() => 
          isLinkActive('/admin-dashboard', { key: 'tab', value: 'settings' })
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
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
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
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
