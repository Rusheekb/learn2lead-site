
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import NewClassEventForm from '../NewClassEventForm';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRelationshipsForTutor } from '@/services/relationships/fetch';
import { supabase } from '@/services/supabaseClient';
import type { Student } from '@/types/sharedTypes';
import type { TutorStudentRelationship } from '@/services/relationships/types';
import Modal from '@/components/common/Modal';
import { Profile } from '@/services/class/types';

interface AddClassDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCreateEvent: () => void;
  onResetForm: () => void;
  currentUser?: Profile | null; // Add the currentUser prop
}

const AddClassDialog: React.FC<AddClassDialogProps> = ({
  isOpen,
  setIsOpen,
  newEvent,
  setNewEvent,
  onCreateEvent,
  onResetForm,
  currentUser, // Include in the props
}) => {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<TutorStudentRelationship[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [selectedRelId, setSelectedRelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Use the user from props or from context
  const tutorUser = currentUser || user;

  useEffect(() => {
    if (!tutorUser || !isOpen) return;
    
    // Make sure the tutorId is correctly set in the newEvent
    if (tutorUser.id && newEvent && !newEvent.tutorId) {
      setNewEvent({
        ...newEvent,
        tutorId: tutorUser.id,
        tutorName: tutorUser.first_name ? `${tutorUser.first_name} ${tutorUser.last_name || ''}`.trim() : 'Current Tutor'
      });
    }
    
    const loadRelationshipsAndStudents = async () => {
      setIsLoading(true);
      try {
        // Load active pairings for this tutor
        console.log(`Loading relationships for tutor ID: ${tutorUser.id}`);
        const rels = await fetchRelationshipsForTutor(tutorUser.id);
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
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRelationshipsAndStudents();
  }, [tutorUser, isOpen, newEvent, setNewEvent]);

  const handleCancel = () => {
    setIsOpen(false);
    onResetForm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Schedule New Class"
      maxWidth="max-w-2xl"
      maxHeight="max-h-[90vh] sm:max-h-[80vh]"
      className="bg-white text-gray-900"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 justify-end w-full">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="bg-white text-gray-900 hover:bg-gray-100 w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="py-8 text-center">Loading student data...</div>
      ) : (
        <NewClassEventForm
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          assignedStudents={assignedStudents}
          relationships={relationships}
          selectedRelId={selectedRelId}
          setSelectedRelId={setSelectedRelId}
          onSubmit={onCreateEvent}
        />
      )}
    </Modal>
  );
};

export default AddClassDialog;
