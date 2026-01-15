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
import { Clock, Calendar as CalendarIcon, User, Video, FileText, Download, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import { formatTime } from '@/utils/timeUtils';
import { ClassSession, StudentUpload } from '@/types/classTypes';
import StudentFileUpload from './StudentFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { viewClassFile, deleteClassFile } from '@/services/classUploadsService';

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
  const [tutorMaterials, setTutorMaterials] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && classSession) {
      fetchUploads();
      fetchTutorMaterials();
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

  const fetchTutorMaterials = async () => {
    if (!classSession) return;
    
    try {
      const { data, error } = await supabase
        .from('scheduled_classes')
        .select('materials_url')
        .eq('id', classSession.id)
        .single();

      if (error) throw error;
      
      setTutorMaterials(data?.materials_url || []);
    } catch (error) {
      console.error('Error fetching tutor materials:', error);
      // Don't show error toast for this as it's secondary functionality
    }
  };

  const handleUpload = async (file: File, note: string) => {
    if (!classSession) return;

    try {
      // Get current user's profile for student name
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .single();

      const studentName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
        : session.user.email || 'Student';

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `${timestamp}_${random}.${fileExt}`;
      const filePath = `class_uploads/${classSession.id}/${fileName}`;

      // Upload directly to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Create database record
      const { error: dbError } = await supabase
        .from('class_uploads')
        .insert({
          class_id: classSession.id,
          student_name: studentName,
          file_name: file.name,
          file_path: filePath,
          file_size: `${Math.round(file.size / 1024)} KB`,
          upload_date: new Date().toISOString().split('T')[0],
          note: note || null,
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Try to clean up the uploaded file
        await supabase.storage.from('materials').remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      fetchUploads();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (upload: StudentUpload) => {
    try {
      const { data, error } = await supabase.storage
        .from('materials')
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

  const handleView = async (upload: StudentUpload) => {
    try {
      if (!upload.id) {
        throw new Error('Upload ID not found');
      }
      await viewClassFile(upload.id);
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        title: "Error",
        description: "Failed to open file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (upload: StudentUpload) => {
    try {
      if (!upload.id) {
        throw new Error('Upload ID not found');
      }

      if (window.confirm(`Are you sure you want to delete ${upload.fileName}?`)) {
        await deleteClassFile(upload.id);
        // Refresh the uploads list
        fetchUploads();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
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
                    {format(parseDateToLocal(classSession.date), 'EEEE, MMMM d, yyyy')}
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
                <StudentFileUpload
                  classId={classSession.id}
                  onUpload={handleUpload}
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading materials...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Tutor Materials */}
                  {tutorMaterials.length > 0 && (
                    <div>
                      <h5 className="text-md font-medium mb-3 text-primary">
                        📚 Tutor Materials
                      </h5>
                      <div className="space-y-3">
                        {tutorMaterials.map((url, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg bg-accent/20"
                          >
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">{getFilenameFromUrl(url)}</p>
                                <p className="text-sm text-muted-foreground">
                                  Provided by tutor
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" />
                                View
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Uploads */}
                  <div>
                    <h5 className="text-md font-medium mb-3 text-secondary-foreground">
                      📁 Student Uploads
                    </h5>
                    {uploads.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No student materials uploaded yet</p>
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
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(upload)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(upload)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(upload)}
                                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* No materials at all */}
                  {tutorMaterials.length === 0 && uploads.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No materials available for this class yet</p>
                      <p className="text-sm">Your tutor may add materials before class starts</p>
                    </div>
                  )}
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