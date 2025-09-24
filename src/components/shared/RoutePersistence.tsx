import { useAuth } from '@/contexts/AuthContext';
import { useRoutePersistence } from '@/hooks/useRoutePersistence';

export const RoutePersistence = () => {
  const { user } = useAuth();
  
  useRoutePersistence(user?.id || null);
  
  return null; // This component doesn't render anything
};