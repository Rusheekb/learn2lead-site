
import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('profile.language')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-gray-900">
                {t('profile.preferredLanguage')}
              </h3>
              <LanguageSwitcher />
            </div>
            <p className="text-sm text-gray-500">
              {t('profile.languageDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AppearanceSettings;
