
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle, Database, Download, Save, UploadCloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';

interface BackupLog {
  id: string;
  name: string;
  file_path: string;
  size_bytes: number;
  status: string;
  created_by: string;
  created_at: string;
}

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
          description: `Backup "${data.name}" was created at ${format(new Date(data.timestamp), 'PPpp')}`,
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
              
              <div className="border rounded-md">
                {isLoadingBackups ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('loading')}...
                  </div>
                ) : backups.length > 0 ? (
                  <div className="divide-y">
                    {backups.map((backup: BackupLog) => (
                      <div key={backup.id} className="p-3 flex justify-between items-center hover:bg-muted/50">
                        <div>
                          <p className="font-medium">{backup.name}</p>
                          <div className="text-sm text-muted-foreground flex flex-col gap-1">
                            <span>{format(new Date(backup.created_at), 'PPpp')}</span>
                            {backup.size_bytes && <span>{formatBytes(backup.size_bytes)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('admin.noBackupsAvailable')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleRestoreSelect}
              disabled={backups.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('admin.restoreBackup')}
            </Button>
            <Button onClick={handleCreateBackup}>
              <Save className="mr-2 h-4 w-4" />
              {t('admin.createBackup')}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Create Backup Dialog */}
      <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
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
            <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={() => createBackup()}
              disabled={isCreatingBackup}
            >
              {isCreatingBackup ? `${t('creating')}...` : t('admin.createBackup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.restoreBackup')}</DialogTitle>
            <DialogDescription>
              {t('admin.selectBackupToRestore')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {isLoadingBackups ? (
              <div className="p-4 text-center text-muted-foreground">
                {t('loading')}...
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup: BackupLog) => (
                  <div 
                    key={backup.id}
                    className="p-4 border rounded-md flex justify-between items-center hover:bg-muted/50 cursor-pointer"
                    onClick={() => confirmRestore(backup)}
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
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
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
              onClick={executeRestore}
              disabled={isRestoring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRestoring ? `${t('restoring')}...` : t('admin.confirmRestore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSettings;
