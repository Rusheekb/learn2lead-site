
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentContent } from '@/components/shared/StudentContent.tsx';

import { format } from 'date-fns';
import { FileText, ExternalLink } from 'lucide-react';

interface ClassDetailsDialogProps {
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  selectedClass: any;
  activeDetailsTab: string;
  setActiveDetailsTab: (tab: string) => void;
  studentUploads: any[];
  studentMessages: any[];
  handleDownloadFile: (uploadId: string) => Promise<void>;
  formatTime: (time: string) => string;
}

const ClassDetailsDialog: React.FC<ClassDetailsDialogProps> = ({
  isDetailsOpen,
  setIsDetailsOpen,
  selectedClass,
  activeDetailsTab,
  setActiveDetailsTab,
  studentUploads,
  studentMessages,
  handleDownloadFile,
  formatTime,
}) => {
  if (!selectedClass) return null;

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Date not available';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return format(dateObj, 'MMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return String(date);
    }
  };
  
  // Helper function to get filename from URL
  const getFilenameFromUrl = (url: string) => {
    const parts = url.split('/');
    const filename = parts[parts.length - 1].split('?')[0];
    // Decode URI components
    const decodedFilename = decodeURIComponent(filename);
    // Get everything after the last slash and before any query params
    const matches = decodedFilename.match(/[^\/]+\.[^\/\.]+$/);
    return matches ? matches[0] : decodedFilename;
  };

  return (
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{selectedClass?.title}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Class Details</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="student-content">
              Student Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Subject</h4>
                <p className="text-foreground">{selectedClass.subject}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Tutor</h4>
                <p className="text-foreground">{selectedClass.tutorName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Student</h4>
                <p className="text-foreground">{selectedClass.studentName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
                <p className="text-foreground">{formatDate(selectedClass.date)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Time</h4>
                <p className="text-foreground">
                  {formatTime(selectedClass.startTime)} -{' '}
                  {formatTime(selectedClass.endTime)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Zoom Link</h4>
              <a
                href={selectedClass.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {selectedClass.zoomLink}
              </a>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
              <p className="mt-1 text-foreground">
                {selectedClass.notes || 'No notes recorded for this class.'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4 pt-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Class Materials</h4>
              {selectedClass.materialsUrl && selectedClass.materialsUrl.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {selectedClass.materialsUrl.map((url: string, index: number) => (
                    <li key={index} className="p-2 border border-border rounded-md">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <span>{getFilenameFromUrl(url)}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-2">No materials uploaded for this class.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="student-content" className="space-y-4 pt-4">
            <StudentContent
              classId={selectedClass.id}
              uploads={studentUploads}
              onDownload={handleDownloadFile}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailsDialog;
