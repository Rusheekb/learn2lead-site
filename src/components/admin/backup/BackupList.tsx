
import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { BackupLog } from '@/types/backup';

interface BackupListProps {
  backups: BackupLog[];
  isLoading: boolean;
  formatBytes: (bytes: number) => string;
}

const BackupList: React.FC<BackupListProps> = ({ backups, isLoading, formatBytes }) => {
  return (
    <div className="border rounded-md">
      {isLoading ? (
        <div className="p-4 text-center text-muted-foreground">
          Loading...
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
          No backups available
        </div>
      )}
    </div>
  );
};

export default BackupList;
