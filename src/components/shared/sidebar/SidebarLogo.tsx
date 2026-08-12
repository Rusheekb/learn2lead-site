import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/authNavigation';

interface SidebarLogoProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({
  isExpanded,
  toggleSidebar,
}) => {
  const { userRole } = useAuth();
  const dashboardPath = getDashboardPath(userRole);

  return (
    <div
      className={`flex items-center h-12 px-3 border-b border-border ${isExpanded ? 'justify-between' : 'justify-center'}`}
    >
      <Link
        to={dashboardPath}
        className="flex items-center text-sm font-semibold text-tutoring-blue tracking-tight"
        aria-label="Go to dashboard"
      >
        {isExpanded ? (
          <>
            Learn<span className="text-tutoring-teal">2</span>Lead
          </>
        ) : (
          <span className="text-xs font-bold">L2L</span>
        )}
      </Link>
      <button
        onClick={toggleSidebar}
        className="hidden md:flex items-center justify-center w-6 h-6 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none"
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

export default SidebarLogo;
