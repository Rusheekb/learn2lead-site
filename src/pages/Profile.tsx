
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProfilePage from '@/components/shared/ProfilePage';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { useTheme } from '@/contexts/ThemeContext';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { trackPageView } = useAnalyticsTracker();
  const { theme, toggleTheme } = useTheme();
  
  // Track page view on initial render
  useEffect(() => {
    trackPageView('profile-page');
  }, [trackPageView]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-gray-100">{t('profile.myProfile')}</h2>
      <ProfilePage />
    </div>
  );
};

export default Profile;
