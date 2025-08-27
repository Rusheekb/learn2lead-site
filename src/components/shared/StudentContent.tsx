import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileIcon, Download, Eye } from 'lucide-react';
import { StudentUpload } from '@/types/classTypes';

interface StudentContentProps {
  classId: string;
  uploads?: StudentUpload[];
  onFileUpload?: (file: File, note: string) => void;
  onDownload?: (uploadId: string) => Promise<void>;
  onView?: (uploadId: string) => Promise<void>;
  showUploadControls?: boolean;
}

export const StudentContent: React.FC<StudentContentProps> = ({
  classId,
  uploads = [],
  onFileUpload,
  onDownload,
  onView,
  showUploadControls = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadFile = () => {
    if (file && onFileUpload) {
      onFileUpload(file, uploadNote);
      setFile(null);
      setUploadNote('');
    }
  };

  return (
    <div>
      <div className="space-y-4">
        <div className="max-h-[240px] overflow-y-auto border rounded-md p-3">
          {uploads.length > 0 ? (
            <div className="space-y-2">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="border p-2 rounded flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <FileIcon className="h-4 w-4 mr-2" />
                    <div>
                      <p className="font-medium">{upload.fileName}</p>
                      <div className="flex text-xs text-gray-500">
                        <span>{upload.fileSize}</span>
                        <span className="mx-1">•</span>
                        <span>
                          {new Date(upload.uploadDate).toLocaleDateString()}
                        </span>
                      </div>
                      {upload.note && (
                        <p className="text-xs mt-1">{upload.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(upload.id)}
                        title="View file"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(upload.id)}
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No materials uploaded
            </p>
          )}
        </div>

        {showUploadControls && onFileUpload && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={handleFileSelect}
                className="flex-1"
              />
            </div>
            {file && (
              <>
                <Textarea
                  placeholder="Add a note about this file (optional)"
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                />
                <Button onClick={handleUploadFile}>Upload File</Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentContent;