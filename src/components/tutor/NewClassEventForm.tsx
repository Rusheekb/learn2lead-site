
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
    if (onSubmit) {
      form.handleSubmit(() => {
        onSubmit();
      })();
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={handleSubmit} 
        className="space-y-6 sm:space-y-8 w-full max-w-3xl mx-auto" // Added max-width and centered
        aria-label="Schedule new class form"
      >
        {/* Student selection is the most important, so let's put it first */}
        <StudentSelectField 
          form={form} 
          relationships={relationships} 
          assignedStudents={assignedStudents} 
        />
        
        <FormFieldsGroup form={form} />

        {onSubmit && (
          <div className="flex justify-end mt-8 sm:mt-10">
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-tutoring-blue hover:bg-tutoring-blue/90 text-white px-6 sm:px-8 py-2 sm:py-3 h-auto text-base font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue"
              aria-label="Schedule class"
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
