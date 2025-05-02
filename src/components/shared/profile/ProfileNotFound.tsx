
import React from 'react';
import { useTranslation } from 'react-i18next';

const ProfileNotFound: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="text-center py-8 border rounded-md">
      <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
        {t('profile.profileNotFound')}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        {t('profile.pleaseSignIn')}
      </p>
    </div>
  );
};

export default ProfileNotFound;
