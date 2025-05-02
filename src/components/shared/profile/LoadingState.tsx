
import React from 'react';
import { useTranslation } from 'react-i18next';

const LoadingState: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <p>{t('common.loading')}</p>
    </div>
  );
};

export default LoadingState;
