
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye, Clock } from 'lucide-react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { ContentShareItem } from '@/types/sharedTypes';

interface ShareTableProps {
  shares: ContentShareItem[];
  user: { id: string } | null;
  handleDownload: (filePath: string | null) => void;
  markAsViewed: (shareId: string) => void;
  getUserName: (userId: string) => string;
}

const ShareTable: React.FC<ShareTableProps> = ({
  shares,
  user,
  handleDownload,
  markAsViewed,
  getUserName,
}) => {
  const columns: ColumnDefinition<ContentShareItem>[] = [
    {
      header: 'Title',
      cell: (share) => (
        <div>
          <div className="font-medium">{share.title}</div>
          {share.description && (
            <p className="text-sm text-gray-500">{share.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'From/To',
      cell: (share) => {
        const isSender = share.sender_id === user?.id;
        return isSender
          ? getUserName(share.receiver_id)
          : getUserName(share.sender_id);
      },
    },
    {
      header: 'Date',
      cell: (share) => new Date(share.shared_at).toLocaleDateString(),
    },
    {
      header: 'Status',
      cell: (share) => (
        share.viewed_at ? (
          <div className="flex items-center text-green-600">
            <Eye className="h-4 w-4 mr-1" /> Viewed
          </div>
        ) : (
          <div className="flex items-center text-amber-600">
            <Clock className="h-4 w-4 mr-1" /> Pending
          </div>
        )
      ),
    },
    {
      header: 'Actions',
      cell: (share) => {
        const isSender = share.sender_id === user?.id;
        return (
          <div className="flex space-x-2">
            {share.file_path && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(share.file_path)}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                <span>Download</span>
              </Button>
            )}

            {!isSender && !share.viewed_at && (
              <Button
                size="sm"
                onClick={() => markAsViewed(share.id)}
                variant="secondary"
              >
                Mark as Viewed
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={shares}
      columns={columns}
      showCard={false}
    />
  );
};

export default ShareTable;
