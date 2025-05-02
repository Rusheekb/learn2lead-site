
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppRole } from '@/types/profile';
import SidebarLinks from '@/components/SidebarLinks';

interface DashboardSidebarProps {
  role: AppRole;
  expanded: boolean;
  toggleSidebar: () => void;
  signOut: () => Promise<void>;
  className?: string;
}

const DashboardSidebar = ({ 
  role, 
  expanded, 
  toggleSidebar,
  signOut,
  className = ''
}: DashboardSidebarProps) => {
  return (
    <aside 
      className={`${
        expanded ? 'w-64' : 'w-20'
      } transition-all duration-300 ease-in-out bg-gray-100 dark:bg-gray-800 shadow-md h-screen overflow-auto flex flex-col z-30 ${className}`}
      aria-label="Dashboard sidebar"
    >
      <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
        <Link
          to="/"
          className={`${
            !expanded ? 'justify-center' : ''
          } flex items-center text-xl font-bold text-tutoring-blue dark:text-tutoring-teal`}
          aria-label="Go to homepage"
        >
          {expanded ? (
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
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex-grow p-4">
        <SidebarLinks role={role} expanded={expanded} />
      </div>

      {/* Logout button in sidebar footer */}
      <div className="p-4 border-t dark:border-gray-700 mt-auto">
        <button
          onClick={signOut}
          className={`${
            expanded
              ? 'flex items-center w-full'
              : 'flex justify-center w-full'
          } px-4 py-2 mt-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-tutoring-blue dark:focus:ring-tutoring-teal`}
          aria-label="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
            <path d="M4 8a1 1 0 011-1h5a1 1 0 110 2H5a1 1 0 01-1-1z" />
          </svg>
          {expanded && <span className="ml-2">Logout</span>}
          <span className="sr-only">Logout from application</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
