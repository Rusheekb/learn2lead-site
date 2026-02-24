
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, addHours, addWeeks, setMinutes, setHours, startOfDay, isAfter } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import NewClassEventForm from '../NewClassEventForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClassValidator } from '@/services/classValidation';
import { ErrorHandler } from '@/services/errorHandling';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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
  const [studentCredits, setStudentCredits] = useState<number | null>(null);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);
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
        ...prev, // Preserve any existing values
        tutorId: tutorId,
        tutorName: tutorDisplayName,
        date: baseDate,
        startTime: format(nextHour, 'HH:mm'),
        endTime: format(addHours(nextHour, 1), 'HH:mm'),
        title: prev.title || 'New Class Session',
        subject: prev.subject || '',
        // Only set zoomLink from profile if not already provided
        zoomLink: prev.zoomLink || currentUser?.zoom_link || '',
        notes: prev.notes || '',
        studentId: prev.studentId || '',
        studentName: prev.studentName || '',
        relationshipId: prev.relationshipId || '',
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
  const handleStudentChange = async (studentId: string) => {
    const selectedStudent = studentOptions.find(s => s.id === studentId);
    
    if (selectedStudent) {
      setNewEvent({
        ...newEvent,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        relationshipId: selectedStudent.relationshipId
      });
      console.log(`Selected student ${selectedStudent.name} with relationship ID ${selectedStudent.relationshipId}`);
      
      // Fetch credit balance
      setIsCheckingCredits(true);
      setStudentCredits(null);
      try {
        const { data, error } = await supabase.rpc('get_student_credit_balance', {
          p_student_id: studentId
        });
        if (error) {
          console.error('Error checking credit balance:', error);
          toast.error('Could not check student credit balance');
        } else {
          setStudentCredits(data ?? 0);
        }
      } catch (err) {
        console.error('Error checking credits:', err);
      } finally {
        setIsCheckingCredits(false);
      }
    } else {
      setNewEvent({
        ...newEvent,
        studentId: '',
        studentName: '',
        relationshipId: ''
      });
      setStudentCredits(null);
    }
  };

  // Calculate number of recurring classes
  const getRecurringClassCount = (): number => {
    if (!newEvent.recurring || !newEvent.date || !newEvent.recurringUntil) return 1;
    const startDate = startOfDay(newEvent.date as Date);
    const endDate = newEvent.recurringUntil as Date;
    let count = 0;
    for (let i = 0; i < 12; i++) {
      const d = addWeeks(startDate, i);
      if (isAfter(d, endDate)) break;
      count++;
    }
    return Math.max(count, 1);
  };

  const classCount = newEvent.recurring ? getRecurringClassCount() : 1;

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
      const result = await onCreateEvent(newEvent as ClassEvent);
      if (result) {
        setIsOpen(false);
      }
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
              {/* Credit Warning Banners */}
              {studentCredits !== null && studentCredits === 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This student has <strong>no credits remaining</strong>. They need to purchase credits before a class can be scheduled.
                  </AlertDescription>
                </Alert>
              )}
              {studentCredits !== null && studentCredits > 0 && studentCredits < classCount && (
                <Alert className="mb-4 border-amber-500/50 text-amber-700 [&>svg]:text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This student has <strong>{studentCredits} credit{studentCredits === 1 ? '' : 's'}</strong> but scheduling {classCount} classes requires {classCount} credits.
                  </AlertDescription>
                </Alert>
              )}
              {studentCredits !== null && studentCredits > 0 && studentCredits >= classCount && studentCredits <= 2 && (
                <Alert className="mb-4 border-amber-500/50 text-amber-700 [&>svg]:text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This student only has <strong>{studentCredits} credit{studentCredits === 1 ? '' : 's'}</strong> remaining.
                  </AlertDescription>
                </Alert>
              )}

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
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || isCheckingCredits || studentCredits === 0}
                >
                  {isCheckingCredits ? 'Checking credits...' : isSubmitting ? 'Creating...' : 'Schedule Class'}
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
