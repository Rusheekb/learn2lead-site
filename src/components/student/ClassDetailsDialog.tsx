
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ClassSessionDetail from './ClassSessionDetail';
import { StudentContent } from '@/components/shared/StudentContent';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import { ClassItem, ClassSession } from '@/types/classTypes';
import { FileText, ExternalLink } from 'lucide-react';

interface ClassDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClass: ClassItem | null;
  studentUploads: StudentUpload[];
  studentMessages: StudentMessage[];
  onFileUpload: (classId: string, file: File, note: string) => void;
  onSendMessage: (classId: string, message: string) => void;
}

const ClassDetailsDialog: React.FC<ClassDetailsDialogProps> = ({
  open,
  onOpenChange,
  selectedClass,
  studentUploads,
  studentMessages,
  onFileUpload,
  onSendMessage,
}) => {
  const [activeTab, setActiveTab] = useState('details');
  
  if (!selectedClass) return null;

  const classSession: ClassSession = {
    id: selectedClass.id,
    title: selectedClass.title,
    subjectId: selectedClass.subjectId || selectedClass.subject,
    tutorName: selectedClass.tutorName,
    date: selectedClass.date,
    startTime: selectedClass.startTime,
    endTime: selectedClass.endTime,
    zoomLink: selectedClass.zoomLink,
    recurring: selectedClass.recurring || false,
    studentName: selectedClass.studentName,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">{selectedClass?.title || 'Class Details'}</DialogTitle>
        </DialogHeader>

        {selectedClass && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700">
              <TabsTrigger 
                value="details"
                className="dark:data-[state=active]:bg-gray-600 dark:text-gray-200 dark:data-[state=active]:text-gray-100"
              >
                Class Details
              </TabsTrigger>
              <TabsTrigger 
                value="materials"
                className="dark:data-[state=active]:bg-gray-600 dark:text-gray-200 dark:data-[state=active]:text-gray-100"
              >
                Materials
              </TabsTrigger>
              <TabsTrigger 
                value="communication"
                className="dark:data-[state=active]:bg-gray-600 dark:text-gray-200 dark:data-[state=active]:text-gray-100"
              >
                Communication
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <ClassSessionDetail session={classSession} />
            </TabsContent>
            
            <TabsContent value="materials">
              <div className="space-y-4 py-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Class Materials</h4>
                {selectedClass.materialsUrl && selectedClass.materialsUrl.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {selectedClass.materialsUrl.map((url: string, index: number) => (
                      <li key={index} className="flex items-center p-2 border rounded-md dark:border-gray-600">
                        <FileText className="h-4 w-4 mr-2 text-tutoring-blue dark:text-tutoring-teal" />
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-tutoring-blue hover:underline dark:text-tutoring-teal flex items-center"
                        >
                          <span className="mr-1">{getFilenameFromUrl(url)}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 mt-2">No materials uploaded for this class.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="communication" className="space-y-4">
              <StudentContent
                classId={selectedClass.id}
                uploads={studentUploads}
                messages={studentMessages}
                onSendMessage={(message) =>
                  onSendMessage(selectedClass.id, message)
                }
                onFileUpload={(file, note) =>
                  onFileUpload(selectedClass.id, file, note)
                }
                showUploadControls={true}
              />
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailsDialog;
