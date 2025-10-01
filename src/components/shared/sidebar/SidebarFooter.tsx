
import React from 'react';
import { LogOut } from 'lucide-react';
import NotificationBell from '../NotificationBell';

interface SidebarFooterProps {
  isExpanded: boolean;
  signOut: () => void;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ isExpanded, signOut }) => {
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut();
  };

  return (
    <div className="p-4 border-t mt-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <NotificationBell />
          {isExpanded && <span className="text-sm text-gray-600">Notifications</span>}
        </div>
      </div>
      
      {/* Logout button */}
      <button
        onClick={handleLogout}
        className={`${
          isExpanded
            ? 'flex items-center w-full'
            : 'flex justify-center w-full'
        } px-4 py-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-tutoring-blue`}
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
