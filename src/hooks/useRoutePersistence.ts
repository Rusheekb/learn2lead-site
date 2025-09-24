import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_STORAGE_KEY = 'last_visited_route';

// Routes that should not be persisted
const PUBLIC_ROUTES = ['/login', '/pricing', '/'];

export const useRoutePersistence = (userId: string | null) => {
  const location = useLocation();

  useEffect(() => {
    if (!userId) return;

    const currentPath = location.pathname + location.search;
    
    // Only save private routes (not public routes)
    if (!PUBLIC_ROUTES.includes(location.pathname)) {
      const routeData = {
        path: currentPath,
        userId,
        timestamp: Date.now()
      };
      localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(routeData));
    }
  }, [location.pathname, location.search, userId]);
};

export const getSavedRoute = (userId: string): string | null => {
  try {
    const saved = localStorage.getItem(ROUTE_STORAGE_KEY);
    if (!saved) return null;

    const routeData = JSON.parse(saved);
    
    // Check if route belongs to current user and is not too old (7 days)
    if (
      routeData.userId === userId &&
      routeData.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000 &&
      !PUBLIC_ROUTES.includes(routeData.path.split('?')[0])
    ) {
      return routeData.path;
    }
  } catch (error) {
    console.error('Error retrieving saved route:', error);
  }
  
  return null;
};

export const clearSavedRoute = () => {
  localStorage.removeItem(ROUTE_STORAGE_KEY);
};