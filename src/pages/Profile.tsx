
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackPageView } = useAnalyticsTracker();
  
  // Track page view on initial render
  useEffect(() => {
    trackPageView('profile-page');
  }, [trackPageView]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('profile.myProfile')}</h2>
      
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.accountDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t('profile.email')}</h3>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t('profile.userId')}</h3>
                <p className="text-gray-900">{user.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;
