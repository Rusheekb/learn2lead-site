
import React from 'react';
import { Card } from '@/components/ui/card';
import { BackupLog } from '@/types/backup';
import BackupCardHeader from './BackupCardHeader';
import BackupCardContent from './BackupCardContent';
import BackupCardFooter from './BackupCardFooter';

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
  return (
    <Card>
      <BackupCardHeader />
      <BackupCardContent 
        backups={backups} 
        isLoadingBackups={isLoadingBackups} 
        formatBytes={formatBytes} 
      />
      <BackupCardFooter
        onCreateBackup={onCreateBackup}
        onRestoreBackup={onRestoreBackup}
        isRestoreDisabled={backups.length === 0}
      />
    </Card>
  );
};

export default BackupCard;
