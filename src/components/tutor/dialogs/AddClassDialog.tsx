
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import NewClassEventForm from '../NewClassEventForm';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRelationshipsForTutor } from '@/services/relationships/fetch';
import { supabase } from '@/services/supabaseClient';
import type { Student } from '@/types/sharedTypes';
import type { TutorStudentRelationship } from '@/services/relationships/types';
import Modal from '@/components/common/Modal';

interface AddClassDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCreateEvent: () => void;
  onResetForm: () => void;
}

const AddClassDialog: React.FC<AddClassDialogProps> = ({
  isOpen,
  setIsOpen,
  newEvent,
  setNewEvent,
  onCreateEvent,
  onResetForm,
}) => {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<TutorStudentRelationship[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [selectedRelId, setSelectedRelId] = useState<string>('');

  useEffect(() => {
    if (!user || !isOpen) return;
    
    const loadRelationshipsAndStudents = async () => {
      // Load active pairings for this tutor
      const rels = await fetchRelationshipsForTutor(user.id);
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
        
        // Ensure the data conforms to the Student type
        const typedStudents: Student[] = studentsData.map(student => ({
          id: student.id,
          name: student.name,
          subjects: student.subjects || []
        }));
        
        setAssignedStudents(typedStudents);
      }
    };

    loadRelationshipsAndStudents();
  }, [user, isOpen]);

  const handleCancel = () => {
    setIsOpen(false);
    onResetForm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Schedule New Class"
      maxWidth="max-w-xl"
      maxHeight="max-h-[80vh]"
      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <NewClassEventForm
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        assignedStudents={assignedStudents}
        relationships={relationships}
        selectedRelId={selectedRelId}
        setSelectedRelId={setSelectedRelId}
        onSubmit={onCreateEvent}
      />
    </Modal>
  );
};

export default AddClassDialog;
