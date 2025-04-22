import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>From/To</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shares.map((share) => {
          const isSender = share.sender_id === user?.id;
          return (
            <TableRow key={share.id}>
              <TableCell className="font-medium">
                {share.title}
                {share.description && (
                  <p className="text-sm text-gray-500">{share.description}</p>
                )}
              </TableCell>
              <TableCell>
                {isSender
                  ? getUserName(share.receiver_id)
                  : getUserName(share.sender_id)}
              </TableCell>
              <TableCell>
                {new Date(share.shared_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {share.viewed_at ? (
                  <div className="flex items-center text-green-600">
                    <Eye className="h-4 w-4 mr-1" /> Viewed
                  </div>
                ) : (
                  <div className="flex items-center text-amber-600">
                    <Clock className="h-4 w-4 mr-1" /> Pending
                  </div>
                )}
              </TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default ShareTable;
