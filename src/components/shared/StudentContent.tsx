
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon, Check, Send, Download } from "lucide-react";
import { StudentMessage, StudentUpload } from "@/types/classTypes";

interface StudentContentProps {
  classId: string;
  uploads?: StudentUpload[];
  messages?: StudentMessage[];
  onSendMessage?: (message: string) => void;
  onFileUpload?: (file: File, note: string) => void;
  onMarkAsRead?: (messageId: string) => Promise<void>;
  onDownload?: (uploadId: string) => Promise<void>;
  showUploadControls?: boolean;
}

export const StudentContent: React.FC<StudentContentProps> = ({
  classId,
  uploads = [],
  messages = [],
  onSendMessage,
  onFileUpload,
  onMarkAsRead,
  onDownload,
  showUploadControls = false
}) => {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [activeTab, setActiveTab] = useState<string>("messages");

  const handleSendMessage = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadFile = () => {
    if (file && onFileUpload) {
      onFileUpload(file, uploadNote);
      setFile(null);
      setUploadNote("");
    }
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>
        
        <TabsContent value="messages" className="space-y-4">
          <div className="max-h-[240px] overflow-y-auto border rounded-md p-3">
            {messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`p-2 rounded ${
                      msg.sender === "tutor" 
                        ? "bg-tutoring-blue/10 ml-4" 
                        : "bg-gray-100 mr-4"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium">
                        {msg.sender === "tutor" ? "Tutor" : msg.studentName || "You"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1">{msg.text || msg.message}</p>
                    {msg.sender !== "tutor" && !msg.read && onMarkAsRead && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-1" 
                        onClick={() => onMarkAsRead(msg.id)}
                      >
                        <Check className="h-3 w-3 mr-1" /> Mark as Read
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No messages yet</p>
            )}
          </div>
          
          {onSendMessage && (
            <div className="flex items-center gap-2">
              <Input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..." 
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!message.trim()}>
                <Send className="h-4 w-4 mr-1" /> Send
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="materials" className="space-y-4">
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
                          <span>{new Date(upload.uploadDate).toLocaleDateString()}</span>
                        </div>
                        {upload.note && (
                          <p className="text-xs mt-1">{upload.note}</p>
                        )}
                      </div>
                    </div>
                    {onDownload && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onDownload(upload.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No materials uploaded</p>
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
                  <Button onClick={handleUploadFile}>
                    Upload File
                  </Button>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentContent;
