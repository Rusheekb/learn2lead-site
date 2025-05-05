
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { trackPageView } = useAnalyticsTracker();
  
  // Track page view on initial render
  useEffect(() => {
    trackPageView('profile-page');
  }, [trackPageView]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-gray-100">{t('profile.myProfile')}</h2>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('profile.appearance')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                {t('profile.colorTheme')}
              </h3>
              <ThemeToggle showLabel={true} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('profile.themeDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.accountDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t('profile.email')}</h3>
                <p className="text-gray-900 dark:text-gray-100">{user.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t('profile.userId')}</h3>
                <p className="text-gray-900 dark:text-gray-100">{user.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;
