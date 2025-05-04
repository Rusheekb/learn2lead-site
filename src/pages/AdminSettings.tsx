
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { BackupLog } from '@/types/backup';
import BackupCard from '@/components/admin/backup/BackupCard';
import CreateBackupDialog from '@/components/admin/backup/CreateBackupDialog';
import RestoreBackupDialog from '@/components/admin/backup/RestoreBackupDialog';
import RestoreConfirmDialog from '@/components/admin/backup/RestoreConfirmDialog';

const AdminSettings: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { trackPageView } = useAnalyticsTracker();
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupLog | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  // Track page view on initial render
  React.useEffect(() => {
    trackPageView('admin-settings');
  }, [trackPageView]);

  // Fetch list of backups
  const { 
    data: backups = [], 
    isLoading: isLoadingBackups,
    refetch: refetchBackups 
  } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('db-operations', {
        body: { action: 'list' }
      });
      
      if (data.success && Array.isArray(data.backups)) {
        return data.backups;
      }
      return [];
    }
  });

  // Create backup mutation
  const { mutate: createBackup, isPending: isCreatingBackup } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('db-operations', {
        body: { action: 'create' }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Backup created successfully",
          description: `Backup "${data.name}" was created`,
        });
        refetchBackups();
      } else {
        toast({
          title: "Backup failed",
          description: data.error || "An unknown error occurred",
          variant: "destructive",
        });
      }
      setIsBackupDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Backup failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
      setIsBackupDialogOpen(false);
    }
  });

  // Restore from backup mutation
  const { mutate: restoreBackup, isPending: isRestoring } = useMutation({
    mutationFn: async (backupId: string) => {
      const { data, error } = await supabase.functions.invoke('db-operations', {
        body: { action: 'restore', backupId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Restore completed successfully",
          description: "The database has been restored from the selected backup.",
        });
      } else {
        toast({
          title: "Restore failed",
          description: data.error || "An unknown error occurred",
          variant: "destructive",
        });
      }
      setIsRestoreConfirmOpen(false);
      setIsRestoreDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Restore failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
      setIsRestoreConfirmOpen(false);
      setIsRestoreDialogOpen(false);
    }
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateBackup = () => {
    setIsBackupDialogOpen(true);
  };

  const handleRestoreSelect = () => {
    setIsRestoreDialogOpen(true);
  };

  const confirmRestore = (backup: BackupLog) => {
    setSelectedBackup(backup);
    setIsRestoreConfirmOpen(true);
  };

  const executeRestore = () => {
    if (selectedBackup) {
      restoreBackup(selectedBackup.id);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('dashboard.adminSettings')}</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Database Backup Section */}
        <BackupCard 
          backups={backups}
          isLoadingBackups={isLoadingBackups}
          onCreateBackup={handleCreateBackup}
          onRestoreBackup={handleRestoreSelect}
          formatBytes={formatBytes}
        />
      </div>

      {/* Create Backup Dialog */}
      <CreateBackupDialog 
        isOpen={isBackupDialogOpen}
        onOpenChange={setIsBackupDialogOpen}
        onConfirm={() => createBackup()}
        isCreating={isCreatingBackup}
      />

      {/* Restore Backup Dialog */}
      <RestoreBackupDialog 
        isOpen={isRestoreDialogOpen}
        onOpenChange={setIsRestoreDialogOpen}
        backups={backups}
        isLoading={isLoadingBackups}
        onSelectBackup={confirmRestore}
        formatBytes={formatBytes}
      />

      {/* Restore Confirmation Dialog */}
      <RestoreConfirmDialog 
        isOpen={isRestoreConfirmOpen}
        onOpenChange={setIsRestoreConfirmOpen}
        selectedBackup={selectedBackup}
        onConfirm={executeRestore}
        isRestoring={isRestoring}
      />
    </div>
  );
};

export default AdminSettings;
