
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileUp, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClassContentUploadProps {
  classId: number;
  onUpload?: (file: File, message: string) => void;
  onMessage?: (message: string) => void;
}

const ClassContentUpload: React.FC<ClassContentUploadProps> = ({ 
  classId,
  onUpload,
  onMessage
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("message");
  const [message, setMessage] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileNote, setFileNote] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && onMessage) {
      onMessage(message.trim());
      setMessage("");
      setIsOpen(false);
    }
  };

  const handleUploadContent = () => {
    if (uploadedFile && onUpload) {
      onUpload(uploadedFile, fileNote);
      setUploadedFile(null);
      setFileNote("");
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        Add Content or Message
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Content for Class #{classId}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="message">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </TabsTrigger>
              <TabsTrigger value="upload">
                <FileUp className="h-4 w-4 mr-2" />
                Upload File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="message" className="space-y-4 pt-4">
              <Textarea 
                placeholder="Type your question or message for the tutor..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-32"
              />
              <DialogFooter>
                <Button onClick={handleSendMessage} disabled={!message.trim()}>
                  Send Message
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 pt-4">
              <div className="border-2 border-dashed rounded-md p-6 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label 
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center text-gray-500 hover:text-gray-700"
                >
                  <FileUp className="h-8 w-8 mb-2" />
                  <span className="font-medium">Click to upload</span>
                  <span className="text-sm">or drag and drop</span>
                </label>
                
                {uploadedFile && (
                  <div className="mt-4 text-left bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-500">{Math.round(uploadedFile.size / 1024)} KB</p>
                  </div>
                )}
              </div>
              
              <Textarea 
                placeholder="Add a note about this file (optional)"
                value={fileNote}
                onChange={(e) => setFileNote(e.target.value)}
              />

              <DialogFooter>
                <Button onClick={handleUploadContent} disabled={!uploadedFile}>
                  Upload File
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClassContentUpload;
