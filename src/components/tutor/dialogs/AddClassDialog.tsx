
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, addHours, setMinutes, setHours } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import NewClassEventForm from '../NewClassEventForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AddClassDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newEvent: Partial<ClassEvent>;
  setNewEvent: React.Dispatch<React.SetStateAction<Partial<ClassEvent>>>;
  onCreateEvent: (event: ClassEvent) => void;
  onCancel: () => void;
  currentUser: any;
}

interface StudentOption {
  id: string;
  name: string;
  relationshipId: string;
}

const AddClassDialog: React.FC<AddClassDialogProps> = ({
  isOpen,
  setIsOpen,
  newEvent,
  setNewEvent,
  onCreateEvent,
  onCancel,
  currentUser
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set default values when dialog opens
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    
    // Set next hour as default time
    const now = new Date();
    const nextHour = setMinutes(setHours(now, now.getHours() + 1), 0);
    
    // Create tutor name from profile
    const tutorId = user.id;
    const tutorDisplayName = currentUser?.first_name 
      ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() 
      : 'Current Tutor';
      
    setNewEvent((prev: any) => ({
      ...prev,
      tutorId: tutorId,
      tutorName: tutorDisplayName,
      date: nextHour,
      startTime: format(nextHour, 'HH:mm'),
      endTime: format(addHours(nextHour, 1), 'HH:mm'),
      title: 'New Class Session',
      subject: '',
      zoomLink: 'https://zoom.us/',
    }));
    
    // Load relationships and students data
    const loadRelationshipsAndStudents = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch relationships between this tutor and students
        // Plus join with profiles to get student names
        const { data: relationships, error } = await supabase
          .from('tutor_student_relationships')
          .select(`
            id, 
            student_id,
            profiles:student_id (
              first_name, 
              last_name
            )
          `)
          .eq('tutor_id', user.id)
          .eq('active', true);
          
        if (error) throw error;
        
        if (!relationships || relationships.length === 0) {
          console.log('No student relationships found for tutor');
          return;
        }
        
        console.log('Found relationships:', relationships);
        
        // Convert to format needed for dropdown
        const options: StudentOption[] = relationships.map((rel: any) => ({
          id: rel.student_id,
          name: rel.profiles 
            ? `${rel.profiles.first_name || ''} ${rel.profiles.last_name || ''}`.trim()
            : 'Unnamed Student',
          relationshipId: rel.id
        }));
        
        setStudentOptions(options);
      } catch (err: any) {
        console.error('Error loading student relationships:', err);
        toast(`Failed to load student list: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRelationshipsAndStudents();
  }, [isOpen, user?.id, setNewEvent, currentUser]);
  
  // Handle student selection to update both studentId and relationshipId
  const handleStudentChange = (studentId: string) => {
    const selectedStudent = studentOptions.find(s => s.id === studentId);
    
    if (selectedStudent) {
      setNewEvent({
        ...newEvent,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        relationshipId: selectedStudent.relationshipId // Important: Set the relationship ID
      });
      console.log(`Selected student ${selectedStudent.name} with relationship ID ${selectedStudent.relationshipId}`);
    } else {
      setNewEvent({
        ...newEvent,
        studentId: '',
        studentName: '',
        relationshipId: ''
      });
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    if (!newEvent.title || !newEvent.studentId || !newEvent.relationshipId) {
      toast("Missing information. Please complete all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onCreateEvent(newEvent as ClassEvent);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast(`Failed to create class: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl px-8 bg-white text-gray-900 border">
        <div className="py-2">
          <h2 className="text-lg font-semibold">Schedule New Class</h2>
          
          {isLoading ? (
            <div className="py-8 sm:py-12 text-center text-lg">Loading student data...</div>
          ) : (
            <div className="py-4 sm:py-6 px-3 sm:px-6">
              <NewClassEventForm
                newEvent={newEvent}
                setNewEvent={setNewEvent}
                studentOptions={studentOptions}
                onStudentSelect={handleStudentChange}
              />
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Schedule Class'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClassDialog;
