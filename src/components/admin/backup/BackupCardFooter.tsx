
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';

interface BackupCardFooterProps {
  onCreateBackup: () => void;
  onRestoreBackup: () => void;
  isRestoreDisabled: boolean;
}

const BackupCardFooter: React.FC<BackupCardFooterProps> = ({
  onCreateBackup,
  onRestoreBackup,
  isRestoreDisabled,
}) => {
  const { t } = useTranslation();

  return (
    <CardFooter className="flex justify-between">
      <Button 
        variant="outline" 
        onClick={onRestoreBackup}
        disabled={isRestoreDisabled}
      >
        <Download className="mr-2 h-4 w-4" />
        {t('admin.restoreBackup')}
      </Button>
      <Button onClick={onCreateBackup}>
        <Save className="mr-2 h-4 w-4" />
        {t('admin.createBackup')}
      </Button>
    </CardFooter>
  );
};

export default BackupCardFooter;
