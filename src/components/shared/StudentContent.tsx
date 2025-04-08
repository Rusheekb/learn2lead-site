
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Download } from "lucide-react";

export interface StudentUpload {
  id: number;
  classId: number;
  studentName: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  note?: string;
}

export interface StudentMessage {
  id: number;
  classId: number;
  studentName: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface StudentContentProps {
  classId?: number;
  uploads: StudentUpload[];
  messages: StudentMessage[];
  onDownload?: (uploadId: number) => void;
  onMarkAsRead?: (messageId: number) => void;
}

const StudentContent: React.FC<StudentContentProps> = ({
  classId,
  uploads,
  messages,
  onDownload,
  onMarkAsRead
}) => {
  // Filter by class ID if provided
  const filteredUploads = classId ? uploads.filter(u => u.classId === classId) : uploads;
  const filteredMessages = classId ? messages.filter(m => m.classId === classId) : messages;

  if (filteredUploads.length === 0 && filteredMessages.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        <p>No student content available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredMessages.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">Student Messages</h3>
          <div className="space-y-3">
            {filteredMessages.map(message => (
              <Card key={message.id} className={message.isRead ? "bg-white" : "bg-blue-50"}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message from {message.studentName}
                    </CardTitle>
                    {!message.isRead && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">New</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{message.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{message.timestamp}</p>
                </CardContent>
                {!message.isRead && onMarkAsRead && (
                  <CardFooter>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onMarkAsRead(message.id)}
                    >
                      Mark as read
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {filteredUploads.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">Student Uploads</h3>
          <div className="space-y-3">
            {filteredUploads.map(upload => (
              <Card key={upload.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    File from {upload.studentName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="font-medium">{upload.fileName}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                    <span>{upload.fileSize}</span>
                    <span>{upload.uploadDate}</span>
                  </div>
                  {upload.note && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">{upload.note}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onDownload && onDownload(upload.id)}
                  >
                    <Download className="h-4 w-4 mr-1" /> Download File
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentContent;
