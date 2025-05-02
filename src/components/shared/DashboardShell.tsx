
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'lucide-react';
import AppSidebar from './AppSidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileMenuButton from '@/components/navigation/MobileMenuButton';

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ 
  children, 
  title 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isExpanded, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - hidden by default on mobile */}
      <AppSidebar
        className={isMobile && !isExpanded ? "hidden" : ""}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="p-4 flex justify-between items-center">
            {/* Mobile menu button */}
            {isMobile && (
              <MobileMenuButton
                isOpen={isExpanded}
                onClick={toggleSidebar}
              />
            )}
            
            <h1 className={`text-xl font-semibold text-gray-800 dark:text-gray-100 ${isMobile ? 'mx-auto' : ''}`}>
              {title}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="sr-only">Today's date</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                  {user?.email}
                </p>
                <div className="w-10 h-10 rounded-full bg-tutoring-blue dark:bg-tutoring-teal text-white flex items-center justify-center" aria-hidden="true">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
