// Simplified class logs hook - delegates to new simplified version
import { useSimplifiedClassLogs } from './useSimplifiedClassLogs';

/**
 * Simplified class logs hook - wrapper for backward compatibility
 */
export const useClassLogs = () => {
  return useSimplifiedClassLogs();
};