
import React, { useState } from 'react';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, MessageSquare, CheckCircle } from 'lucide-react';

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
  onSendMessage?: (message: string) => void;
  onFileUpload?: (file: File, note: string) => void;
  onMarkAsRead?: (messageId: string) => void;
  onDownload?: (uploadId: string) => void;
  showUploadControls?: boolean;
}

const StudentContent: React.FC<StudentContentProps> = ({
  classId,
  uploads,
  messages,
  onSendMessage,
  onFileUpload,
  onMarkAsRead,
  onDownload,
  showUploadControls = false,
}) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState('');
  const [activeTab, setActiveTab] = useState('messages');

  const filteredUploads = uploads.filter(upload => upload.classId === classId);
  const filteredMessages = messages.filter(msg => msg.classId === classId);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    onSendMessage?.(message);
    setMessage('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    onFileUpload?.(file, uploadNote);
    setFile(null);
    setUploadNote('');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleString();
    } catch (e) {
      return dateTimeString;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="uploads">Uploads</TabsTrigger>
      </TabsList>

      <TabsContent value="messages" className="space-y-4">
        <div className="max-h-80 overflow-y-auto space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No messages yet</div>
          ) : (
            filteredMessages.map(msg => (
              <Card key={msg.id} className={`${!msg.isRead ? 'border-tutoring-blue border-2' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{msg.studentName}</p>
                      <p className="text-sm text-gray-500">{formatDateTime(msg.timestamp)}</p>
                    </div>
                    {!msg.isRead && onMarkAsRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkAsRead(msg.id)}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark Read</span>
                      </Button>
                    )}
                  </div>
                  <p className="mt-2">{msg.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {onSendMessage && (
          <div className="flex gap-2 mt-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-grow"
            />
            <Button onClick={handleSendMessage} className="self-end">
              <MessageSquare className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="uploads" className="space-y-4">
        <div className="max-h-80 overflow-y-auto space-y-3">
          {filteredUploads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No uploads yet</div>
          ) : (
            filteredUploads.map(upload => (
              <Card key={upload.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{upload.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {upload.studentName} • {formatDate(upload.uploadDate)} • {upload.fileSize}
                      </p>
                    </div>
                    {onDownload && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownload(upload.id)}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                  {upload.note && <p className="mt-2 text-sm">{upload.note}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {showUploadControls && onFileUpload && (
          <div className="space-y-3 mt-4 pt-4 border-t">
            <h4 className="font-medium">Upload File</h4>
            <Input
              type="file"
              onChange={handleFileChange}
              className="mb-2"
            />
            <Textarea
              value={uploadNote}
              onChange={(e) => setUploadNote(e.target.value)}
              placeholder="Add a note (optional)"
            />
            <Button
              onClick={handleUpload}
              disabled={!file}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default StudentContent;

export { StudentContent };
