import React, { useState } from 'react';
import { Video, FileText, Upload, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentUpload } from '@/types/classTypes';
import { StudentContent } from '@/components/shared/StudentContent';
import CalendarLinks from '@/components/shared/CalendarLinks';
import CompletedClassActions from '@/components/tutor/CompletedClassActions';
import { uploadMaterial, addMaterialToClass, removeMaterialFromClass } from '@/services/materialsService';
import { toast } from 'sonner';

interface ClassEventDetailsProps {
  selectedEvent: ClassEvent;
  studentUploads: StudentUpload[];
  onDownloadFile: (uploadId: string) => Promise<void>;
  onViewFile: (uploadId: string) => Promise<void>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  refreshEvent?: () => Promise<void>;
}

const ClassEventDetails: React.FC<ClassEventDetailsProps> = ({
  selectedEvent,
  studentUploads,
  onDownloadFile,
  onViewFile,
  activeTab,
  setActiveTab,
  refreshEvent,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedEvent.id) return;

    setIsUploading(true);
    try {
      const materialUrl = await uploadMaterial(selectedFile, selectedEvent.id);
      if (materialUrl) {
        const success = await addMaterialToClass(selectedEvent.id, materialUrl);
        if (success && refreshEvent) {
          await refreshEvent();
          setSelectedFile(null);
        }
      }
    } catch (error) {
      console.error('Error uploading material:', error);
      toast.error('Failed to upload material');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMaterial = async (materialUrl: string) => {
    if (!selectedEvent.id) return;
    
    try {
      const success = await removeMaterialFromClass(selectedEvent.id, materialUrl);
      if (success && refreshEvent) {
        await refreshEvent();
      }
    } catch (error) {
      console.error('Error removing material:', error);
      toast.error('Failed to remove material');
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

  return (
    <div className="space-y-4">
      {/* Class Completion Actions */}
      <CompletedClassActions 
        classEvent={selectedEvent} 
        onUpdate={refreshEvent ? () => refreshEvent() : () => {}} 
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white">
          <TabsTrigger value="details">Class Details</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="student-content">Student Content</TabsTrigger>
        </TabsList>

      <TabsContent value="details" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Student</h4>
            <p>{selectedEvent.studentName}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Subject</h4>
            <p>{selectedEvent.subject}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Date</h4>
            <p>
              {selectedEvent.date instanceof Date
                ? selectedEvent.date.toLocaleDateString()
                : new Date(selectedEvent.date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Time</h4>
            <p>
              {selectedEvent.startTime} - {selectedEvent.endTime}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500">Zoom Link</h4>
          <a
            href={selectedEvent.zoomLink || '#'}
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
            <CalendarLinks classEvent={selectedEvent} />
          </div>
        </div>

        {selectedEvent.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-500">Notes</h4>
            <p className="text-gray-700">{selectedEvent.notes}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="materials" className="space-y-4 pt-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Upload Materials</h4>
            <div className="flex space-x-2">
              <Input 
                type="file" 
                onChange={handleFileChange}
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
              />
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || isUploading}
                size="sm"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
                {!isUploading && <Upload className="ml-1 h-4 w-4" />}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Class Materials</h4>
            {selectedEvent.materialsUrl && selectedEvent.materialsUrl.length > 0 ? (
              <ul className="space-y-2">
                {selectedEvent.materialsUrl.map((url, index) => (
                  <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-tutoring-blue hover:underline flex items-center"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span>{getFilenameFromUrl(url || '')}</span>
                    </a>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveMaterial(url)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No materials uploaded for this class.</p>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="student-content" className="space-y-4 pt-4">
        <StudentContent
          classId={selectedEvent.id}
          uploads={studentUploads}
          onDownload={onDownloadFile}
          onView={onViewFile}
        />
      </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClassEventDetails;
