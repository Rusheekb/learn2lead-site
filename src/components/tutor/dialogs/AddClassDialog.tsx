
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, addHours, setMinutes, setHours } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import NewClassEventForm from '../NewClassEventForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClassValidator } from '@/services/classValidation';
import { ErrorHandler } from '@/services/errorHandling';

interface AddClassDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newEvent: Partial<ClassEvent>;
  setNewEvent: React.Dispatch<React.SetStateAction<Partial<ClassEvent>>>;
  onCreateEvent: (event: ClassEvent) => Promise<boolean>;
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
  const initializedRef = useRef(false);
  
  // Set default values when dialog opens (only once)
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    
    // Only initialize once per dialog open
    if (initializedRef.current) return;
    
    // Set next hour as default time
    const now = new Date();
    const nextHour = setMinutes(setHours(now, now.getHours() + 1), 0);
    
    // Create tutor name from profile
    const tutorId = user.id;
    const tutorDisplayName = currentUser?.first_name 
      ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() 
      : 'Current Tutor';
      
    setNewEvent((prev: any) => {
      // Only set defaults if values are not already present
      if (prev.tutorId && prev.date && prev.startTime) {
        return prev; // Already initialized
      }
      
      const baseDate = prev.date || nextHour;
      return {
        tutorId: tutorId,
        tutorName: tutorDisplayName,
        date: baseDate,
        startTime: format(nextHour, 'HH:mm'),
        endTime: format(addHours(nextHour, 1), 'HH:mm'),
        title: 'New Class Session',
        subject: '',
        zoomLink: 'https://zoom.us/',
        notes: '',
        studentId: '',
        studentName: '',
        relationshipId: '',
        ...prev, // Preserve any existing values
      };
    });
    
    // Load relationships and students data
    const loadRelationshipsAndStudents = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Query tutor_student_relationships using the new function
        const { data: relationshipData, error } = await supabase.rpc('get_tutor_student_relationships', {
          tutor_uuid: user.id
        });
        
        if (error) {
          console.error('Error loading student relationships:', error);
          toast.error(`Failed to load student list: ${error.message}`);
          return;
        }
        
        if (!relationshipData || relationshipData.length === 0) {
          console.log('No student relationships found for tutor');
          return;
        }
        
        console.log('Found relationships:', relationshipData);
        
        // Convert to format needed for dropdown
        const options: StudentOption[] = (relationshipData as any[]).map((rel: any) => ({
          id: rel.student_id,
          name: rel.student_name || `Student (${rel.student_id?.substring(0, 8)}...)`,
          relationshipId: rel.relationship_id // Use the actual relationship ID
        }));
        
        console.log('Converted student options:', options);
        
        setStudentOptions(options);
      } catch (err: any) {
        console.error('Error loading student relationships:', err);
        toast.error(`Failed to load student list: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRelationshipsAndStudents();
    initializedRef.current = true;
  }, [isOpen, user?.id]);
  
  // Reset initialization flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
    }
  }, [isOpen]);
  
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
    
    // Validate the form data
    const validationErrors = ClassValidator.validateClassCreation(newEvent);
    if (validationErrors.length > 0) {
      toast.error(ClassValidator.formatValidationErrors(validationErrors));
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onCreateEvent(newEvent as ClassEvent);
      setIsOpen(false);
      toast.success('Class scheduled successfully');
    } catch (error: any) {
      ErrorHandler.handle(error, 'AddClassDialog.handleSubmit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] px-4 sm:px-8 bg-white text-gray-900 border">
        <div className="flex flex-col h-full max-h-[calc(90vh-4rem)]">
          <h2 className="text-lg font-semibold py-2 flex-shrink-0">Schedule New Class</h2>
          
          {isLoading ? (
            <div className="py-8 sm:py-12 text-center text-lg">Loading student data...</div>
          ) : (
            <>
              {/* Scrollable Form Area */}
              <div className="flex-1 overflow-y-auto py-4 px-1">
                <NewClassEventForm
                  newEvent={newEvent}
                  setNewEvent={setNewEvent}
                  studentOptions={studentOptions}
                  onStudentSelect={handleStudentChange}
                />
              </div>
              
              {/* Fixed Footer - Outside scroll container */}
              <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t bg-white">
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Schedule Class'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClassDialog;
