
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const BackupCardHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Database className="h-5 w-5" />
        {t('admin.databaseBackup')}
      </CardTitle>
      <CardDescription>
        {t('admin.manageBackups')}
      </CardDescription>
    </CardHeader>
  );
};

export default BackupCardHeader;
