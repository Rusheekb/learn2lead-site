
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export const useSidebarStyles = () => {
  const baseClasses = useMemo(() => 
    'flex items-center px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-tutoring-blue',
  []);
  
  const activeClasses = useMemo(() => 
    'bg-gray-200 text-tutoring-blue font-medium',
  []);

  const isLinkActive = (path: string, queryParam?: { key: string, value?: string }) => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);

    // First check if we're on the correct path
    const pathMatches = location.pathname === path;
    
    // If no query param is required, just check the path
    if (!queryParam) return pathMatches;
    
    // Check if the query parameter exists and has the right value (if specified)
    const paramExists = searchParams.has(queryParam.key);
    if (!paramExists) return false;
    
    // If a specific value is required, check that too
    if (queryParam.value) {
      return pathMatches && searchParams.get(queryParam.key) === queryParam.value;
    }
    
    // Otherwise just confirm the path matches and the param exists
    return pathMatches;
  };

  return { baseClasses, activeClasses, isLinkActive };
};
