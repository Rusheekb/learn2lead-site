import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export const useSidebarStyles = () => {
  const location = useLocation();

  const baseClasses = useMemo(
    () =>
      'flex items-center px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-tutoring-blue',
    []
  );

  const activeClasses = useMemo(
    () => 'bg-gray-200 text-tutoring-blue font-medium',
    []
  );

  const isLinkActive = (
    path: string,
    queryParam?: { key: string; value?: string | null }
  ) => {
    const searchParams = new URLSearchParams(location.search);
    const pathMatches = location.pathname === path;

    if (!queryParam) return pathMatches;

    // value: null means the param must NOT be present (e.g. the default/no-tab state)
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
