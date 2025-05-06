
import React from 'react';
import { LogOut } from 'lucide-react';
import NotificationBell from '../NotificationBell';

interface SidebarFooterProps {
  isExpanded: boolean;
  signOut: () => void;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ isExpanded, signOut }) => {
  return (
    <div className="p-4 border-t dark:border-gray-700 mt-auto">
      <div className="flex items-center justify-between mb-2">
        <NotificationBell />
        {isExpanded && <span className="text-sm text-gray-600 dark:text-gray-400">Notifications</span>}
      </div>
      
      {/* Logout button */}
      <button
        onClick={signOut}
        className={`${
          isExpanded
            ? 'flex items-center w-full'
            : 'flex justify-center w-full'
        } px-4 py-2 mt-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-tutoring-blue dark:focus:ring-tutoring-teal`}
        aria-label="Log out"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        {isExpanded && <span className="ml-2">Logout</span>}
        <span className="sr-only">Logout from application</span>
      </button>
    </div>
  );
};

export default SidebarFooter;
