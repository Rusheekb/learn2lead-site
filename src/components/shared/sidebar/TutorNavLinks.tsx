
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, User, Calendar, Book } from 'lucide-react';

interface TutorNavLinksProps {
  isExpanded: boolean;
  baseClasses: string;
  expandedClasses: string;
  profilePath: string;
}

const TutorNavLinks: React.FC<TutorNavLinksProps> = ({ 
  isExpanded, 
  baseClasses, 
  expandedClasses, 
  profilePath 
}) => {
  return (
    <nav className="space-y-1" aria-label="Tutor navigation">
      <NavLink 
        to="/tutor-dashboard" 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
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
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
            : `${baseClasses} ${expandedClasses}`
        }
        aria-label="My Schedule"
      >
        <Calendar className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-3">My Schedule</span>}
      </NavLink>
      <NavLink 
        to="/tutor-dashboard?tab=resources" 
        className={({ isActive }) => 
          isActive 
            ? `${baseClasses} ${expandedClasses} bg-gray-200 dark:bg-gray-700 text-tutoring-blue dark:text-tutoring-teal font-medium`
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

export default TutorNavLinks;
