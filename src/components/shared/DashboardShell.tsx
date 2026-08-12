import React, { ReactNode, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import PageBreadcrumbs from './PageBreadcrumbs';
import { useClassNotifications } from '@/hooks/useClassNotifications';
import { Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import CommandPalette from './CommandPalette';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardShellProps {
  title: string;
  children: ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ title, children }) => {
  const [searchParams] = useSearchParams();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { userRole } = useAuth();

  useClassNotifications();

  // Cmd+K / Ctrl+K — admin only
  useEffect(() => {
    if (userRole !== 'admin') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [userRole]);

  return (
    <div
      className="flex flex-col md:flex-row h-screen bg-background"
      role="application"
      aria-label={`${title} dashboard`}
    >
      {/* Mobile Navigation Trigger */}
      <div className="md:hidden flex items-center p-3 border-b bg-card">
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
        <h1 className="text-lg font-bold mx-auto truncate">{title}</h1>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Main Content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 focus:outline-none"
      >
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs + Cmd+K trigger */}
          <div className="hidden md:flex items-center justify-between mb-1">
            <PageBreadcrumbs />
            {userRole === 'admin' && (
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-2 text-xs text-muted-foreground border rounded-md px-3 py-1.5 hover:bg-accent transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                Search…
                <kbd className="ml-1 inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium">
                  ⌘K
                </kbd>
              </button>
            )}
          </div>

          {/* Title visible only on desktop */}
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>

          {children}
        </div>
      </main>

      {userRole === 'admin' && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardShell;
