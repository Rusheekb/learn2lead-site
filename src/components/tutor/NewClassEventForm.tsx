
import React from 'react';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Student } from '@/types/sharedTypes';
import { TutorStudentRelationship } from '@/services/relationships/types';
import StudentSelectField from './forms/StudentSelectField';
import FormFieldsGroup from './forms/FormFieldsGroup';
import { useNewClassEventForm } from '@/hooks/tutor-scheduler/useNewClassEventForm';

interface NewClassEventFormProps {
  newEvent: any;
  setNewEvent: (event: any) => void;
  assignedStudents: Student[];
  relationships: TutorStudentRelationship[];
  selectedRelId: string;
  setSelectedRelId: (id: string) => void;
  onSubmit?: () => void;
}

const NewClassEventForm: React.FC<NewClassEventFormProps> = ({
  newEvent,
  setNewEvent,
  assignedStudents,
  relationships,
  selectedRelId,
  setSelectedRelId,
  onSubmit,
}) => {
  const { form } = useNewClassEventForm(
    newEvent, 
    setNewEvent, 
    relationships, 
    assignedStudents, 
    selectedRelId, 
    setSelectedRelId
  );

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit(() => {
      if (onSubmit) onSubmit();
    })();
  };

  // Check if form is valid for button state
  const isFormValid = form.formState.isValid;
  const isDirty = form.formState.isDirty;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormFieldsGroup form={form} />
        <StudentSelectField 
          form={form} 
          relationships={relationships} 
          assignedStudents={assignedStudents} 
        />

        {onSubmit && (
          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              disabled={!isFormValid || !isDirty}
              className="bg-tutoring-blue hover:bg-tutoring-blue/90 text-white"
            >
              Schedule Class
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
};

export default NewClassEventForm;
