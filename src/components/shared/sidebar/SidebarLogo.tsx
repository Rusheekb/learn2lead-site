
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/authNavigation';

interface SidebarLogoProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({ isExpanded, toggleSidebar }) => {
  const { userRole } = useAuth();
  const dashboardPath = getDashboardPath(userRole);
  
  return (
    <div className="p-4 flex items-center justify-between border-b border-gray-200">
      <Link
        to={dashboardPath}
        className={`${
          !isExpanded ? 'justify-center' : ''
        } flex items-center text-lg sm:text-xl font-bold text-tutoring-blue`}
        aria-label="Go to dashboard"
      >
        {isExpanded ? (
          <>
            Learn<span className="text-tutoring-teal">2</span>Lead
          </>
        ) : (
          'L2L'
        )}
      </Link>
      <button
        onClick={toggleSidebar}
        className="text-gray-600 hover:text-gray-900 hidden md:block focus:outline-none focus:ring-2 focus:ring-tutoring-blue rounded-md"
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
  );
};

export default SidebarLogo;
