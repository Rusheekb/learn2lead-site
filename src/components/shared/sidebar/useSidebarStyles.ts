
import { useMemo } from 'react';

export const useSidebarStyles = () => {
  const baseClasses = useMemo(() => 
    'flex items-center px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-tutoring-blue dark:focus:ring-tutoring-teal',
  []);

  return { baseClasses };
};
