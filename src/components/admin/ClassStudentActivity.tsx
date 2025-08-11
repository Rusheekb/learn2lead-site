
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import UpcomingClassesTable from '../student/UpcomingClassesTable';
import ClassDetailsDialog from '../student/ClassDetailsDialog';
import { StudentUpload, StudentMessage } from '@/types/classTypes';
import { supabase } from '@/integrations/supabase/client';
import { fetchClassLogs } from '@/services/classLogsService';
import {
  fetchClassUploads,
  uploadClassFile,
} from '@/services/classUploadsService';
import useStudentRealtime from '@/hooks/student/useStudentRealtime';
import { ClassItem } from '@/types/classTypes';
import { ClassEvent } from '@/types/tutorTypes';
import { TransformedClassLog } from '@/services/logs/types';

const ClassStudentActivity: React.FC = () => {
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const currentStudentName = 'Current Student'; // This would come from auth context in a real app

  // Setup realtime subscriptions for uploads only
  // useStudentRealtime removed as messaging functionality is disabled

  useEffect(() => {
    const loadClasses = async () => {
      setIsLoading(true);
      try {
        const classLogs = await fetchClassLogs();

        const transformedClasses: ClassItem[] = classLogs.map((cl: TransformedClassLog) => ({
          id: cl.id,
          title: cl.title || cl.classNumber || '',
          subject: cl.subject,
          tutorName: cl.tutorName || 'Ms. Johnson',
          date:
            cl.date instanceof Date
              ? cl.date.toISOString().split('T')[0]
              : String(cl.date),
          startTime: cl.startTime,
          endTime: cl.endTime,
          status: cl.additionalInfo?.includes('Status:') 
            ? cl.additionalInfo.split('Status:')[1].trim().split(' ')[0] 
            : 'upcoming',
          attendance: cl.additionalInfo?.includes('Attendance:')
            ? cl.additionalInfo.split('Attendance:')[1].trim().split(' ')[0]
            : 'pending',
          zoomLink: cl.zoomLink || '',
          notes: cl.notes || cl.additionalInfo || '',
          studentName: cl.studentName,
          subjectId: cl.subject,
          recurring: false,
        }));

        setClasses(transformedClasses);
      } catch (error) {
        console.error('Error loading classes:', error);
        toast.error('Failed to load classes');
      } finally {
        setIsLoading(false);
      }
    };

    loadClasses();
  }, []);

  useEffect(() => {
    const loadClassContent = async () => {
      if (!selectedClass) return;

      try {
        const classId = selectedClass.id;

        // Message loading removed - messaging functionality disabled

        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error) {
        console.error('Error loading class content:', error);
      }
    };

    loadClassContent();
  }, [selectedClass]);

  const handleFileUpload = async (
    classId: string,
    file: File,
    note: string
  ) => {
    try {
      const upload = await uploadClassFile(
        classId,
        currentStudentName,
        file,
        note
      );

      if (upload) {
        setStudentUploads((prevUploads) => [...prevUploads, upload]);
        toast.success('File uploaded successfully');
      } else {
        toast.error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
  };

  // Message sending removed - messaging functionality disabled

  const handleViewClass = (cls: ClassItem) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Upcoming Classes</h2>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <p>Loading classes...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No scheduled classes found</p>
            </div>
          ) : (
            <UpcomingClassesTable
              classes={classes as any}
              onViewClass={handleViewClass as any}
            />
          )}
        </CardContent>
      </Card>

      <ClassDetailsDialog
        isOpen={isDetailsOpen}
        setIsOpen={setIsDetailsOpen}
        selectedClass={selectedClass}
        studentUploads={studentUploads}
        studentMessages={[]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onFileUpload={handleFileUpload}
        onSendMessage={async () => {}}
      />
    </div>
  );
};

export default ClassStudentActivity;
