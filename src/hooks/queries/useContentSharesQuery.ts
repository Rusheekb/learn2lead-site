
/**
 * @deprecated Use the hooks from src/hooks/queries/content-shares instead
 */

import { 
  useContentSharesBaseQuery, 
  useContentSharesMutations, 
  useUserContentSharesQuery,
  contentSharesKeys 
} from './content-shares';

/**
 * Hook for content shares operations - kept for backward compatibility
 */
export const useContentSharesQuery = () => {
  const baseQuery = useContentSharesBaseQuery();
  const mutations = useContentSharesMutations();

  return {
    ...baseQuery,
    ...mutations,
  };
};

// Export for backward compatibility
export { useUserContentSharesQuery, contentSharesKeys };
