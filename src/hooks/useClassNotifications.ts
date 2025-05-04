
import { useEffect } from 'react';
import { checkUpcomingClasses } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

// This hook will check for upcoming classes periodically
export const useClassNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Check immediately on login
    checkUpcomingClasses();
    
    // Then check every minute
    const intervalId = setInterval(() => {
      checkUpcomingClasses();
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);
};
