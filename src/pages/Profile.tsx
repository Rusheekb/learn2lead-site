
import React, { useEffect } from 'react';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import ProfilePage from '@/components/shared/ProfilePage';

const Profile: React.FC = () => {
  const { trackPageView } = useAnalyticsTracker();
  
  // Track page view on initial render
  useEffect(() => {
    trackPageView('profile-page');
  }, [trackPageView]);

  return <ProfilePage />;
};

export default Profile;
