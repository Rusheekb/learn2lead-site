import React from 'react';
import { FileText, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export interface StudentMessage {
  id: string;
  classId: string;
  studentName: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface StudentUpload {
  id: string;
  classId: string;
  studentName: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  note: string | null;
}

interface StudentContentProps {
  classId: string;
  uploads: StudentUpload[];
  messages: StudentMessage[];
  onDownload: (uploadId: number) => void;
  onMarkAsRead: (messageId: number) => void;
}

const StudentContent: React.FC<StudentContentProps> = ({
  uploads,
  messages,
  onDownload,
  onMarkAsRead
}) => {
  return (
    <div className="space-y-6">
      {/* Messages Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Messages</h3>
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`p-4 rounded-lg border ${!message.isRead ? 'border-tutoring-blue bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">{message.studentName}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="mt-2 text-gray-700">{message.message}</p>
                {!message.isRead && (
                  <button
                    onClick={() => onMarkAsRead(parseInt(message.id, 10))}
                    className="mt-2 text-sm text-tutoring-blue hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No messages yet</p>
        )}
      </div>

      {/* Uploads Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Uploads</h3>
        {uploads.length > 0 ? (
          <div className="space-y-4">
            {uploads.map((upload) => (
              <div 
                key={upload.id}
                className="p-4 rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">{upload.fileName}</span>
                  </div>
                  <button
                    onClick={() => onDownload(parseInt(upload.id, 10))}
                    className="text-sm text-tutoring-blue hover:underline"
                  >
                    Download
                  </button>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <span>{upload.fileSize}</span>
                  <span className="mx-2">•</span>
                  <span>{format(new Date(upload.uploadDate), 'MMM d, h:mm a')}</span>
                </div>
                {upload.note && (
                  <p className="mt-2 text-gray-700">{upload.note}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No uploads yet</p>
        )}
      </div>
    </div>
  );
};

export default StudentContent;
