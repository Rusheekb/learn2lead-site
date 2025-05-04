
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
import { Video, FileText, ExternalLink } from 'lucide-react';
import { ClassItem } from '@/types/classTypes';
import CalendarLinks from '@/components/shared/CalendarLinks';
import { format } from 'date-fns';
import { AttendanceStatus, ClassStatus, ClassEvent } from '@/types/tutorTypes';

interface ClassDetailsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedClass: ClassItem | null;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  studentUploads?: any[];
  studentMessages?: any[];
  onFileUpload?: (classId: string, file: File, note: string) => Promise<void>;
  onSendMessage?: (classId: string, messageText: string) => Promise<void>;
}

const ClassDetailsDialog: React.FC<ClassDetailsDialogProps> = ({
  isOpen,
  setIsOpen,
  selectedClass,
  activeTab = "details",
  setActiveTab = () => {},
  studentUploads = [],
  studentMessages = [],
  onFileUpload,
  onSendMessage,
}) => {
  if (!selectedClass) return null;

  // Convert ClassItem to compatible format for CalendarLinks
  const classEventFormat: ClassEvent = {
    ...selectedClass,
    id: selectedClass.id,
    tutorId: '',
    studentId: '',
    notes: selectedClass.notes || null,
    // Ensure these are properly cast to the expected enum types
    status: (selectedClass.status as ClassStatus) || 'scheduled',
    attendance: (selectedClass.attendance as AttendanceStatus) || 'pending'
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{selectedClass.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Class Details</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                <p>{selectedClass.subject}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Tutor</h4>
                <p>{selectedClass.tutorName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Date</h4>
                <p>
                  {selectedClass.date instanceof Date
                    ? format(selectedClass.date, 'MMMM d, yyyy')
                    : format(new Date(selectedClass.date), 'MMMM d, yyyy')}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Time</h4>
                <p>
                  {selectedClass.startTime} - {selectedClass.endTime}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Zoom Link</h4>
              <a
                href={selectedClass.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tutoring-blue hover:underline flex items-center"
              >
                <Video className="h-4 w-4 mr-1" />
                <span>Join Meeting</span>
              </a>
            </div>

            {/* Add Calendar Integration Section */}
            <div>
              <h4 className="text-sm font-medium text-gray-500">Calendar Integration</h4>
              <div className="mt-2">
                <CalendarLinks classEvent={classEventFormat} />
              </div>
            </div>

            {selectedClass.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                <p className="mt-1 text-gray-700">{selectedClass.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-4 pt-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Class Materials</h4>
              {selectedClass.materialsUrl && selectedClass.materialsUrl.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {selectedClass.materialsUrl.map((url, index) => (
                    <li key={index} className="flex items-center p-2 border rounded-md">
                      <FileText className="h-4 w-4 mr-2 text-tutoring-blue" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-tutoring-blue hover:underline flex items-center"
                      >
                        <span className="mr-1">{getFilenameFromUrl(url)}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 mt-2">No materials uploaded for this class.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailsDialog;
