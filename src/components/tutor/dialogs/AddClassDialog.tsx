
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import NewClassEventForm from '../NewClassEventForm';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRelationshipsForTutor } from '@/services/relationships/fetch';
import { supabase } from '@/services/supabaseClient';
import type { Student } from '@/types/sharedTypes';
import type { TutorStudentRelationship } from '@/services/relationships/types';
import Modal from '@/components/common/Modal';
import { Profile } from '@/types/profile';
import { format } from 'date-fns';

interface AddClassDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCreateEvent: () => void;
  onResetForm: () => void;
  currentUser?: Profile | null; // Using the Profile type from @/types/profile
}

const AddClassDialog: React.FC<AddClassDialogProps> = ({
  isOpen,
  setIsOpen,
  newEvent,
  setNewEvent,
  onCreateEvent,
  onResetForm,
  currentUser,
}) => {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<TutorStudentRelationship[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [selectedRelId, setSelectedRelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Always use auth user ID for queries - this is guaranteed to exist
  const tutorId = user?.id;

  // Initialize default values when opening the modal
  useEffect(() => {
    if (!tutorId || !isOpen) return;
    
    // Initialize default values for the form
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    
    const endTime = new Date(nextHour);
    endTime.setHours(endTime.getHours() + 1);
    
    // Setup initial values with proper tutor information
    const tutorDisplayName = currentUser?.first_name 
      ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() 
      : 'Current Tutor';
      
    setNewEvent({
      tutorId: tutorId,
      tutorName: tutorDisplayName,
      date: nextHour,
      startTime: format(nextHour, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      title: 'New Class Session',
      subject: '',
      zoomLink: 'https://zoom.us/',
    });
    
    // Load relationships and students data
    const loadRelationshipsAndStudents = async () => {
      setIsLoading(true);
      try {
        // Load active pairings for this tutor
        console.log(`Loading relationships for tutor ID: ${tutorId}`);
        const rels = await fetchRelationshipsForTutor(tutorId);
        console.log(`Loaded ${rels.length} relationships`);
        setRelationships(rels);

        // Get unique student IDs from relationships
        const studentIds = Array.from(new Set(rels.map(rel => rel.student_id)));

        // Fetch student details if we have relationships
        if (studentIds.length > 0) {
          const { data: studentsData, error } = await supabase
            .from('students')
            .select('id, name, subjects')
            .in('id', studentIds);
          
          if (error) {
            console.error('Error fetching students:', error);
            return;
          }
          
          console.log(`Loaded ${studentsData?.length || 0} students`);
          
          // Ensure the data conforms to the Student type
          const typedStudents: Student[] = studentsData.map(student => ({
            id: student.id,
            name: student.name,
            subjects: student.subjects || [],
            email: '' // Add any required fields
          }));
          
          setAssignedStudents(typedStudents);
          
          // Set the first relationship as selected by default if available
          if (rels.length > 0 && !selectedRelId) {
            setSelectedRelId(rels[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRelationshipsAndStudents();
  }, [tutorId, isOpen, setNewEvent, currentUser]);

  const handleCancel = () => {
    setIsOpen(false);
    onResetForm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Schedule New Class"
      maxWidth="max-w-5xl" // Increased modal width
      maxHeight="max-h-[95vh]" // Increased modal height
      className="bg-white text-gray-900"
      onCancel={handleCancel} // Explicit cancel handler
      footer={
        <div className="flex flex-col sm:flex-row gap-3 justify-end w-full">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="bg-white text-gray-900 hover:bg-gray-100 w-full sm:w-auto px-6 py-2 text-base"
          >
            Cancel
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="py-12 text-center text-lg">Loading student data...</div>
      ) : (
        <div className="py-4"> {/* Added extra padding */}
          <NewClassEventForm
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            assignedStudents={assignedStudents}
            relationships={relationships}
            selectedRelId={selectedRelId}
            setSelectedRelId={setSelectedRelId}
            onSubmit={onCreateEvent}
          />
        </div>
      )}
    </Modal>
  );
};

export default AddClassDialog;
