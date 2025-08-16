import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Calendar as CalendarIcon, User, Video, Upload, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatTime } from './ClassSessionDetail';
import { ClassSession, StudentUpload } from '@/types/classTypes';
import ClassContentUpload from '@/components/shared/ClassContentUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentClassDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classSession: ClassSession | null;
}

const StudentClassDetailsDialog: React.FC<StudentClassDetailsDialogProps> = ({
  open,
  onOpenChange,
  classSession,
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [uploads, setUploads] = useState<StudentUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && classSession) {
      fetchUploads();
    }
  }, [open, classSession]);

  const fetchUploads = async () => {
    if (!classSession) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('class_uploads')
        .select('*')
        .eq('class_id', classSession.id);

      if (error) throw error;
      
      // Transform the data to match StudentUpload interface
      const transformedUploads: StudentUpload[] = (data || []).map(upload => ({
        id: upload.id,
        fileName: upload.file_name,
        uploadDate: upload.upload_date,
        fileSize: upload.file_size,
        uploadPath: upload.file_path,
        classId: upload.class_id,
        studentName: upload.student_name,
        note: upload.note,
      }));
      
      setUploads(transformedUploads);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch uploads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File, note: string) => {
    if (!classSession) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `class-uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('class-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('class_uploads')
        .insert({
          class_id: classSession.id,
          file_name: file.name,
          file_path: filePath,
          file_size: `${Math.round(file.size / 1024)} KB`,
          upload_date: new Date().toISOString().split('T')[0],
          note: note || null,
          student_name: 'Current Student', // This would come from user profile
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      fetchUploads();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (upload: StudentUpload) => {
    try {
      const { data, error } = await supabase.storage
        .from('class-materials')
        .download(upload.uploadPath || '');

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = upload.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  if (!classSession) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {classSession.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Class Details</TabsTrigger>
            <TabsTrigger value="materials">Materials & Uploads</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  <span>Tutor: {classSession.tutorName}</span>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>
                    {format(new Date(classSession.date), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>
                    {formatTime(classSession.startTime)} - {formatTime(classSession.endTime)}
                  </span>
                </div>

                {classSession.recurring && (
                  <div className="flex items-center">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Recurring Class
                    </span>
                    {classSession.recurringDays && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Every {classSession.recurringDays.join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {classSession.zoomLink && (
                  <Button
                    className="w-full"
                    asChild
                  >
                    <a href={classSession.zoomLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4 mr-2" />
                      Join Class
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium">Class Materials</h4>
                <ClassContentUpload
                  classId={parseInt(classSession.id)}
                  onUpload={handleUpload}
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading materials...
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No materials uploaded yet</p>
                  <p className="text-sm">Use the upload button above to add files</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{upload.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {upload.fileSize} • Uploaded on {format(new Date(upload.uploadDate), 'MMM d, yyyy')}
                          </p>
                          {upload.note && (
                            <p className="text-sm text-muted-foreground italic">
                              Note: {upload.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(upload)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentClassDetailsDialog;