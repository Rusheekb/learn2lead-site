
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateBackupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isCreating: boolean;
}

const CreateBackupDialog: React.FC<CreateBackupDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isCreating,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.createBackup')}</DialogTitle>
          <DialogDescription>
            {t('admin.createBackupDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center p-3 border rounded-md bg-muted/50">
            <Save className="h-8 w-8 mr-3 text-primary" />
            <div>
              <h4 className="font-medium">{t('admin.createBackupNow')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('admin.backupProcessDescription')}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isCreating}
          >
            {isCreating ? `${t('creating')}...` : t('admin.createBackup')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBackupDialog;
