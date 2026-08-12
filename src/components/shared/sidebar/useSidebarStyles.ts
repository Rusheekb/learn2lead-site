import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export const useSidebarStyles = () => {
  const location = useLocation();

  const baseClasses = useMemo(
    () =>
      'flex items-center px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    []
  );

  const activeClasses = useMemo(
    () => 'bg-tutoring-lightBlue !text-tutoring-blue font-medium',
    []
  );

  const isLinkActive = (
    path: string,
    queryParam?: { key: string; value?: string | null }
  ) => {
    const searchParams = new URLSearchParams(location.search);
    const pathMatches = location.pathname === path;

    if (!queryParam) return pathMatches;

    if (queryParam.value === null) {
      return pathMatches && !searchParams.has(queryParam.key);
    }

    const paramExists = searchParams.has(queryParam.key);
    if (!paramExists) return false;

    if (queryParam.value !== undefined) {
      return (
        pathMatches && searchParams.get(queryParam.key) === queryParam.value
      );
    }

    return pathMatches;
  };

  return { baseClasses, activeClasses, isLinkActive };
};
