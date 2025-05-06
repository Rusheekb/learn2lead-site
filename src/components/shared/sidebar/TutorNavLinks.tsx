
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, User, Calendar, Book } from 'lucide-react';
import { useSidebarStyles } from './useSidebarStyles';

interface TutorNavLinksProps {
  isExpanded: boolean;
  profilePath: string;
}

const TutorNavLinks: React.FC<TutorNavLinksProps> = ({ 
  isExpanded, 
  profilePath 
}) => {
  const { baseClasses, activeClasses, isLinkActive } = useSidebarStyles();
  const expandedClasses = isExpanded ? 'justify-start' : 'justify-center';
  
  return (
    <nav className="space-y-1" aria-label="Tutor navigation">
      <NavLink 
        to="/tutor-dashboard" 
        className={({ isActive }) => 
          isActive || isLinkActive('/tutor-dashboard')
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
            : `${baseClasses} ${expandedClasses}`
        }
        end
        aria-label="Dashboard"
      >
        <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Dashboard</span>}
      </NavLink>
      <NavLink 
        to="/tutor-dashboard?tab=schedule" 
        className={() => 
          isLinkActive('/tutor-dashboard', { key: 'tab', value: 'schedule' })
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="My Schedule"
      >
        <Calendar className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">My Schedule</span>}
      </NavLink>
      <NavLink 
        to="/tutor-dashboard?tab=resources" 
        className={() => 
          isLinkActive('/tutor-dashboard', { key: 'tab', value: 'resources' })
            ? `${baseClasses} ${expandedClasses} ${activeClasses}`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="Resources"
      >
        <Book className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">Resources</span>}
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

export default TutorNavLinks;
