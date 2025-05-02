
import React from 'react';
import { Video, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import { StudentContent } from '@/components/shared/StudentContent';
import { MessageCountBadge } from '@/components/shared/ClassBadges';
import ChatWindow from '@/components/shared/ChatWindow';

interface ClassEventDetailsProps {
  selectedEvent: ClassEvent;
  studentMessages: StudentMessage[];
  studentUploads: StudentUpload[];
  onMarkAsRead: (messageId: string) => Promise<void>;
  onDownloadFile: (uploadId: string) => Promise<void>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadMessageCount: number;
}

const ClassEventDetails: React.FC<ClassEventDetailsProps> = ({
  selectedEvent,
  studentMessages,
  studentUploads,
  onMarkAsRead,
  onDownloadFile,
  activeTab,
  setActiveTab,
  unreadMessageCount,
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800">
        <TabsTrigger value="details">Class Details</TabsTrigger>
        <TabsTrigger value="student-content">
          Student Content
          <MessageCountBadge count={unreadMessageCount} />
        </TabsTrigger>
        <TabsTrigger value="messages">
          Messages
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Student</h4>
            <p className="dark:text-gray-100">{selectedEvent.studentName}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Subject</h4>
            <p className="dark:text-gray-100">{selectedEvent.subject}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</h4>
            <p className="dark:text-gray-100">
              {selectedEvent.date instanceof Date
                ? selectedEvent.date.toLocaleDateString()
                : new Date(selectedEvent.date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Time</h4>
            <p className="dark:text-gray-100">
              {selectedEvent.startTime} - {selectedEvent.endTime}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Zoom Link</h4>
          <a
            href={selectedEvent.zoomLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tutoring-blue hover:underline dark:text-tutoring-teal flex items-center"
          >
            <Video className="h-4 w-4 mr-1" />
            <span>Join Meeting</span>
          </a>
        </div>

        {selectedEvent.materials && selectedEvent.materials.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Materials</h4>
            <ul className="list-disc list-inside">
              {selectedEvent.materials.map((material, index) => (
                <li
                  key={index}
                  className="text-tutoring-blue hover:underline dark:text-tutoring-teal cursor-pointer"
                >
                  <div className="inline-flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    <span>{material}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedEvent.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</h4>
            <p className="text-gray-700 dark:text-gray-300">{selectedEvent.notes}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="student-content" className="space-y-4 pt-4">
        <StudentContent
          classId={selectedEvent.id}
          uploads={studentUploads}
          messages={studentMessages}
          onDownload={onDownloadFile}
          onMarkAsRead={onMarkAsRead}
        />
      </TabsContent>

      <TabsContent value="messages" className="space-y-4 pt-4">
        <ChatWindow
          classId={selectedEvent.id}
          tutorName="Tutor"
          studentName={selectedEvent.studentName}
          messages={studentMessages}
          onMarkAsRead={onMarkAsRead}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ClassEventDetails;
