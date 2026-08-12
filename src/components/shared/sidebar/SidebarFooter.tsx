import React from 'react';
import { LogOut } from 'lucide-react';
import NotificationBell from '../NotificationBell';

interface SidebarFooterProps {
  isExpanded: boolean;
  signOut: () => void;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({
  isExpanded,
  signOut,
}) => {
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut();
  };

  return (
    <div className="px-2 py-3 border-t border-border">
      <div
        className={`flex items-center mb-1 ${isExpanded ? 'px-1' : 'justify-center'}`}
      >
        <NotificationBell />
        {isExpanded && (
          <span className="ml-2 text-xs text-muted-foreground">
            Notifications
          </span>
        )}
      </div>

      <button
        onClick={handleLogout}
        className={`flex items-center w-full px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isExpanded ? 'justify-start' : 'justify-center'
        }`}
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Logout</span>}
        <span className="sr-only">Logout from application</span>
      </button>
    </div>
  );
};

export default SidebarFooter;
