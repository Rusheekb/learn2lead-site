
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.language')}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={language} 
          onValueChange={(value) => setLanguage(value as 'en' | 'es')}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="en" id="lang-en" />
            <Label htmlFor="lang-en">{t('languages.english')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="es" id="lang-es" />
            <Label htmlFor="lang-es">{t('languages.spanish')}</Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default LanguageSwitcher;
