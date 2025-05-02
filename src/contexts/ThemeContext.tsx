
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics, EventName, EventCategory } from '@/services/analytics/analyticsService';

type Theme = 'dark' | 'light';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to determine if a path is a dashboard path
const isDashboardRoute = (pathname: string): boolean => {
  return pathname.startsWith('/dashboard') || 
         pathname.startsWith('/tutor-dashboard') || 
         pathname.startsWith('/admin-dashboard') ||
         pathname.startsWith('/profile') ||
         pathname.startsWith('/tutor-profile');
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  
  // Check if current route is a dashboard route
  const isCurrentRouteDashboard = isDashboardRoute(location.pathname);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch
    setMounted(true);
    
    const storedTheme = localStorage.getItem('theme') as Theme;
    
    // If user has previously selected a theme, use it (only for dashboard routes)
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Or check system preference
      setTheme('dark');
    }
  }, []);

  // Apply dark class to document element only on dashboard routes
  useEffect(() => {
    if (isCurrentRouteDashboard) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } else {
      // Always remove dark class on public routes
      document.documentElement.classList.remove('dark');
    }
  }, [theme, isCurrentRouteDashboard, location.pathname]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      
      // Track theme toggle analytics event
      analytics.track({
        category: EventCategory.UI,
        name: EventName.TOGGLE_DARK_MODE,
        properties: { 
          from: prevTheme,
          to: newTheme,
          location: location.pathname
        }
      });
      
      if (isCurrentRouteDashboard) {
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      }
      
      return newTheme;
    });
  };

  // If not mounted yet, return children to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
