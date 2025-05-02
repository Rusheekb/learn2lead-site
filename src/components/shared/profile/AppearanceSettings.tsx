
import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../ThemeToggle';
import LanguageSwitcher from '../LanguageSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
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
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('profile.language')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                {t('profile.preferredLanguage')}
              </h3>
              <LanguageSwitcher />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('profile.languageDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AppearanceSettings;
