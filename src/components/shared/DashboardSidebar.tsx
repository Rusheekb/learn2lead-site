
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppRole } from '@/types/profile';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import SidebarLinks from '@/components/SidebarLinks';

interface DashboardSidebarProps {
  role: AppRole;
  expanded: boolean;
  toggleSidebar: () => void;
  signOut: () => Promise<void>;
}

const DashboardSidebar = ({ 
  role, 
  expanded, 
  toggleSidebar,
  signOut
}: DashboardSidebarProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`${
      expanded ? 'w-64' : 'w-20'
    } transition-all duration-300 ease-in-out bg-gray-100 dark:bg-gray-800 shadow-md h-screen overflow-auto flex flex-col`}>
      <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
        <Link
          to="/"
          className={`${
            !expanded ? 'justify-center' : ''
          } flex items-center text-xl font-bold text-tutoring-blue dark:text-tutoring-teal`}
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
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          aria-label="Toggle sidebar"
        >
          {expanded ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="flex-grow p-4">
        <SidebarLinks role={role} expanded={expanded} />
      </div>

      {/* Theme toggle and logout in sidebar footer */}
      <div className="p-4 border-t dark:border-gray-700 mt-auto">
        {expanded ? (
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-700 dark:text-gray-300">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <Switch 
              checked={theme === 'dark'} 
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-tutoring-teal"
            />
          </div>
        ) : (
          <button
            onClick={toggleTheme}
            className="flex justify-center w-full text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 py-2"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        )}
        
        {/* Logout button */}
        <button
          onClick={signOut}
          className={`${
            expanded
              ? 'flex items-center w-full'
              : 'flex justify-center w-full'
          } px-4 py-2 mt-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
            <path d="M4 8a1 1 0 011-1h5a1 1 0 110 2H5a1 1 0 01-1-1z" />
          </svg>
          {expanded && <span className="ml-2">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default DashboardSidebar;
