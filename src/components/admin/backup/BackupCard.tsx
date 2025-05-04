
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BackupLog } from '@/types/backup';
import BackupList from './BackupList';

interface BackupCardProps {
  backups: BackupLog[];
  isLoadingBackups: boolean;
  onCreateBackup: () => void;
  onRestoreBackup: () => void;
  formatBytes: (bytes: number) => string;
}

const BackupCard: React.FC<BackupCardProps> = ({
  backups,
  isLoadingBackups,
  onCreateBackup,
  onRestoreBackup,
  formatBytes,
}) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {t('admin.databaseBackup')}
        </CardTitle>
        <CardDescription>
          {t('admin.manageBackups')}
        </CardDescription>
      </CardHeader>
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
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onRestoreBackup}
          disabled={backups.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          {t('admin.restoreBackup')}
        </Button>
        <Button onClick={onCreateBackup}>
          <Save className="mr-2 h-4 w-4" />
          {t('admin.createBackup')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BackupCard;
