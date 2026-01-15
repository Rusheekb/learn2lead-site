
import React, { ReactNode, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import PageBreadcrumbs from './PageBreadcrumbs';
import { useClassNotifications } from '@/hooks/useClassNotifications';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface DashboardShellProps {
  title: string;
  children: ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ title, children }) => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  // Use the class notifications hook to check for upcoming classes
  useClassNotifications();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Mobile Navigation Trigger */}
      <div className="md:hidden flex items-center p-4 border-b bg-white">
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[80%] max-w-[280px]">
            <AppSidebar className="h-full border-0" />
          </SheetContent>
        </Sheet>
        <h1 className="text-xl font-bold mx-auto">{title}</h1>
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <div className="hidden md:block">
            <PageBreadcrumbs />
          </div>
          
          {/* Title visible only on desktop */}
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardShell;
