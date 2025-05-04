
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BackupLog } from '@/types/backup';

interface RestoreBackupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  backups: BackupLog[];
  isLoading: boolean;
  onSelectBackup: (backup: BackupLog) => void;
  formatBytes: (bytes: number) => string;
}

const RestoreBackupDialog: React.FC<RestoreBackupDialogProps> = ({
  isOpen,
  onOpenChange,
  backups,
  isLoading,
  onSelectBackup,
  formatBytes,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('admin.restoreBackup')}</DialogTitle>
          <DialogDescription>
            {t('admin.selectBackupToRestore')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              {t('loading')}...
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup: BackupLog) => (
                <div 
                  key={backup.id}
                  className="p-4 border rounded-md flex justify-between items-center hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelectBackup(backup)}
                >
                  <div className="flex items-center">
                    <Database className="h-10 w-10 mr-4 text-primary" />
                    <div>
                      <h4 className="font-medium">{backup.name}</h4>
                      <div className="text-sm text-muted-foreground">
                        <p>{format(new Date(backup.created_at), 'PPpp')}</p>
                        {backup.size_bytes && <p>{formatBytes(backup.size_bytes)}</p>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost">
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RestoreBackupDialog;
