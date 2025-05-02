
import { useState, useEffect } from 'react';

export function useSidebar() {
  const [isSidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : true; // Default to expanded
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev: boolean) => !prev);
  };

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(isSidebarExpanded));
  }, [isSidebarExpanded]);

  return {
    isExpanded: isSidebarExpanded,
    toggleSidebar
  };
}
