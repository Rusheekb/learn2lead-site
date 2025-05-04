
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { BackupLog } from '@/types/backup';
import BackupList from './BackupList';

interface BackupCardContentProps {
  backups: BackupLog[];
  isLoadingBackups: boolean;
  formatBytes: (bytes: number) => string;
}

const BackupCardContent: React.FC<BackupCardContentProps> = ({
  backups,
  isLoadingBackups,
  formatBytes,
}) => {
  const { t } = useTranslation();

  return (
    <CardContent>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{t('admin.availableBackups')}</h3>
          <Badge variant="secondary">
            {isLoadingBackups ? 'Loading...' : `${backups.length} backups`}
          </Badge>
        </div>
        
        <BackupList 
          backups={backups} 
          isLoading={isLoadingBackups} 
          formatBytes={formatBytes} 
        />
      </div>
    </CardContent>
  );
};

export default BackupCardContent;
