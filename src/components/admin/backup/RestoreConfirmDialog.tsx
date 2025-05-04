
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BackupLog } from '@/types/backup';

interface RestoreConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBackup: BackupLog | null;
  onConfirm: () => void;
  isRestoring: boolean;
}

const RestoreConfirmDialog: React.FC<RestoreConfirmDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedBackup,
  onConfirm,
  isRestoring,
}) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('admin.confirmRestore')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('admin.restoreWarning')}
            <br/><br/>
            <strong>{t('admin.selectedBackup')}:</strong> {selectedBackup?.name}
            <br/>
            <strong>{t('admin.createdAt')}:</strong> {selectedBackup ? format(new Date(selectedBackup.created_at), 'PPpp') : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRestoring}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRestoring ? `${t('restoring')}...` : t('admin.confirmRestore')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RestoreConfirmDialog;
