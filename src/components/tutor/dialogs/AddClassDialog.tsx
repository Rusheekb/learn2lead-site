
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import NewClassEventForm from '../NewClassEventForm';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRelationshipsForTutor } from '@/services/relationships/fetch';
import { fetchStudents } from '@/services/students/studentService';
import type { Student } from '@/types/sharedTypes';
import type { TutorStudentRelationship } from '@/services/relationships/types';

interface AddClassDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newEvent: any;
  setNewEvent: (event: any) => void;
  students: Student[];
  onCreateEvent: () => void;
  onResetForm: () => void;
}

const AddClassDialog: React.FC<AddClassDialogProps> = ({
  isOpen,
  setIsOpen,
  newEvent,
  setNewEvent,
  students,
  onCreateEvent,
  onResetForm,
}) => {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<TutorStudentRelationship[]>([]);
  const [selectedRelId, setSelectedRelId] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    
    const loadRelationships = async () => {
      // Load active pairings for this tutor
      const rels = await fetchRelationshipsForTutor(user.id);
      setRelationships(rels);
    };

    loadRelationships();
  }, [user]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Schedule New Class
          </DialogTitle>
        </DialogHeader>

        <NewClassEventForm
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          students={students}
          relationships={relationships}
          selectedRelId={selectedRelId}
          setSelectedRelId={setSelectedRelId}
        />

        <DialogFooter className="pt-2">
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                onResetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={onCreateEvent}
              className="bg-tutoring-blue hover:bg-tutoring-blue/90"
            >
              Schedule Class
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddClassDialog;
