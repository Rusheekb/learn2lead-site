// Simplified tutor scheduler hook
import { useSimplifiedTutorScheduler } from './useSimplifiedTutorScheduler';

/**
 * Simplified tutor scheduler hook - wrapper for backward compatibility
 */
export const useTutorScheduler = () => {
  return useSimplifiedTutorScheduler();
};