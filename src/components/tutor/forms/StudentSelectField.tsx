
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { Student } from '@/types/sharedTypes';
import { TutorStudentRelationship } from '@/services/relationships/types';

interface StudentSelectFieldProps {
  form: UseFormReturn<any, any, any>;
  relationships: TutorStudentRelationship[];
  assignedStudents: Student[];
}

const StudentSelectField: React.FC<StudentSelectFieldProps> = ({ 
  form, 
  relationships, 
  assignedStudents 
}) => {
  const selectId = React.useId();
  
  return (
    <FormField
      control={form.control}
      name="relationshipId"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel htmlFor={selectId} className="text-gray-900">
            Student <span className="text-red-500" aria-hidden="true">*</span>
            <span className="sr-only">required</span>
          </FormLabel>
          <Select 
            onValueChange={field.onChange}
            defaultValue={field.value}
            value={field.value}
            aria-required="true"
            aria-invalid={!!form.formState.errors.relationshipId}
          >
            <FormControl>
              <SelectTrigger 
                id={selectId}
                className="bg-white text-gray-900 border-gray-300 w-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue"
                aria-label="Select student"
              >
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="bg-white text-gray-900 border-gray-300 max-h-60 overflow-y-auto">
              {relationships.length > 0 ? (
                relationships.map(rel => {
                  const student = assignedStudents.find(s => s.id === rel.student_id);
                  return (
                    <SelectItem key={rel.id} value={rel.id} className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100">
                      {student?.name ?? 'Loading...'}
                    </SelectItem>
                  );
                })
              ) : (
                <SelectItem value="none" disabled className="text-gray-400">
                  No students available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <FormMessage className="text-red-500 text-xs" role="alert" />
        </FormItem>
      )}
    />
  );
};

export default StudentSelectField;
