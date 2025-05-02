
import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../ThemeToggle';
import LanguageSwitcher from '../LanguageSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.appearance')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ThemeToggle />
        </CardContent>
      </Card>
      
      {/* Add the language switcher */}
      <LanguageSwitcher />
    </>
  );
};

export default AppearanceSettings;
