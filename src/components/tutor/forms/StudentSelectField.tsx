
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
}) => (
  <FormField
    control={form.control}
    name="relationshipId"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Student</FormLabel>
        <Select 
          onValueChange={field.onChange}
          defaultValue={field.value}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {relationships.map(rel => {
              const student = assignedStudents.find(s => s.id === rel.student_id);
              return (
                <SelectItem key={rel.id} value={rel.id}>
                  {student?.name ?? 'Loading...'}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

export default StudentSelectField;
