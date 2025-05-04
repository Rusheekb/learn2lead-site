
import React, { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useClassNotifications } from '@/hooks/useClassNotifications';

interface DashboardShellProps {
  title: string;
  children: ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ title, children }) => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  // Use the class notifications hook to check for upcoming classes
  useClassNotifications();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardShell;
