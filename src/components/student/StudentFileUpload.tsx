import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileUp, Upload } from 'lucide-react';

interface StudentFileUploadProps {
  classId: string;
  onUpload?: (file: File, note: string) => void;
}

const StudentFileUpload: React.FC<StudentFileUploadProps> = ({
  classId,
  onUpload,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileNote, setFileNote] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (uploadedFile && onUpload) {
      setIsUploading(true);
      try {
        await onUpload(uploadedFile, fileNote);
        setUploadedFile(null);
        setFileNote('');
        setIsOpen(false);
      } catch (error) {
        console.error('Upload error:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const resetForm = () => {
    setUploadedFile(null);
    setFileNote('');
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
        <Upload className="h-4 w-4 mr-2" />
        Upload File
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && !isUploading) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File for Class</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="border-2 border-dashed rounded-md p-6 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer flex flex-col items-center ${
                  isUploading ? 'text-gray-400' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileUp className="h-8 w-8 mb-2" />
                <span className="font-medium">
                  {isUploading ? 'Uploading...' : 'Click to upload'}
                </span>
                <span className="text-sm">
                  {isUploading ? 'Please wait' : 'or drag and drop'}
                </span>
              </label>

              {uploadedFile && (
                <div className="mt-4 text-left bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round(uploadedFile.size / 1024)} KB
                  </p>
                </div>
              )}
            </div>

            <Textarea
              placeholder="Add a note about this file (optional)"
              value={fileNote}
              onChange={(e) => setFileNote(e.target.value)}
              disabled={isUploading}
              className="min-h-20"
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={resetForm}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!uploadedFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentFileUpload;