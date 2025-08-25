import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Trash2 } from 'lucide-react';
import { StudentUpload } from '@/types/classTypes';

interface StudentUploadsTableProps {
  uploads: StudentUpload[];
  onDownload: (uploadId: string) => void;
  onView: (uploadId: string) => void;
  onDelete?: (uploadId: string) => void;
  showDeleteButton?: boolean;
}

const StudentUploadsTable: React.FC<StudentUploadsTableProps> = ({
  uploads,
  onDownload,
  onView,
  onDelete,
  showDeleteButton = false,
}) => {
  if (uploads.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-10 h-10 mx-auto mb-2" />
        <p>No student materials have been uploaded yet</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File Name</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>Date Uploaded</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {uploads.map((upload) => (
          <TableRow key={upload.id}>
            <TableCell className="font-medium">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                {upload.fileName}
              </div>
            </TableCell>
            <TableCell>{upload.studentName}</TableCell>
            <TableCell>{upload.uploadDate}</TableCell>
            <TableCell>{upload.fileSize}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(upload.id)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(upload.id)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                {showDeleteButton && onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(upload.id)}
                    className="flex items-center gap-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default StudentUploadsTable;
