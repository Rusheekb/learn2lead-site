
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
        <FormLabel className="dark:text-gray-100">Student <span className="text-red-500">*</span></FormLabel>
        <Select 
          onValueChange={field.onChange}
          defaultValue={field.value}
        >
          <FormControl>
            <SelectTrigger className="bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
          </FormControl>
          <SelectContent className="bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
            {relationships.map(rel => {
              const student = assignedStudents.find(s => s.id === rel.student_id);
              return (
                <SelectItem key={rel.id} value={rel.id} className="dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
                  {student?.name ?? 'Loading...'}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <FormMessage className="text-red-500 dark:text-red-400 text-xs" />
      </FormItem>
    )}
  />
);

export default StudentSelectField;
