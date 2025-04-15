
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { StudentUpload } from "../shared/StudentContent";

interface StudentUploadsTableProps {
  uploads: StudentUpload[];
  onDownload: (uploadId: string) => void;
}

const StudentUploadsTable: React.FC<StudentUploadsTableProps> = ({ uploads, onDownload }) => {
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
                  onClick={() => onDownload(upload.id)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default StudentUploadsTable;
