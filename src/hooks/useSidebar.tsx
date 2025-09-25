
import { useState, useEffect, createContext, useContext } from 'react';


interface SidebarContextType {
  isExpanded: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : true; // Default to expanded
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev: boolean) => {
      const newState = !prev;
      
      // Sidebar toggled successfully
      console.log(`Sidebar toggled from ${prev ? 'expanded' : 'collapsed'} to ${newState ? 'expanded' : 'collapsed'}`);
      
      return newState;
    });
  };

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(isSidebarExpanded));
  }, [isSidebarExpanded]);

  return (
    <SidebarContext.Provider value={{ isExpanded: isSidebarExpanded, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
