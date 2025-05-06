
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarLogoProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({ isExpanded, toggleSidebar }) => {
  return (
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
  );
};

export default SidebarLogo;
