
import { AppRole } from '@/hooks/useProfile';

export const getDashboardPath = (role: AppRole | null): string => {
  if (!role) return '/login';
  
  switch (role) {
    case 'student':
      return '/dashboard';
    case 'tutor':
      return '/tutor-dashboard';
    case 'admin':
      return '/admin-dashboard';
    default:
      return '/login';
  }
};
