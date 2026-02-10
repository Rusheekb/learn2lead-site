
import React from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Student } from './StudentTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface StudentFormProps {
  onAddStudent: (student: Omit<Student, 'id'>) => void;
}

// Define the schema for student validation
const studentSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  grade: z.string().min(1, { message: 'Grade is required' }),
  subjects: z.string().min(1, { message: 'At least one subject is required' }),
  paymentMethod: z.enum(['stripe', 'zelle']),
  classRate: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

const StudentForm: React.FC<StudentFormProps> = ({ onAddStudent }) => {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      email: '',
      grade: '',
      subjects: '',
      paymentMethod: 'zelle',
      classRate: '',
    },
  });

  const onSubmit = (values: StudentFormValues) => {
    const newStudent = {
      name: values.name,
      email: values.email,
      grade: values.grade,
      subjects: values.subjects.split(',').map((s) => s.trim()),
      status: 'active' as const,
      enrollDate: new Date().toISOString().split('T')[0],
      lastSession: 'N/A',
      paymentStatus: 'paid' as const,
      paymentMethod: values.paymentMethod as 'stripe' | 'zelle',
      classRate: values.classRate ? parseFloat(values.classRate) : undefined,
    };

    onAddStudent(newStudent);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="name">Full Name</FormLabel>
                <FormControl>
                  <Input id="name" placeholder="John Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="email">Email</FormLabel>
                <FormControl>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john.smith@example.com" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="grade">Grade Level</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="9th Grade">9th Grade</SelectItem>
                    <SelectItem value="10th Grade">10th Grade</SelectItem>
                    <SelectItem value="11th Grade">11th Grade</SelectItem>
                    <SelectItem value="12th Grade">12th Grade</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="subjects"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="subjects">Subjects (comma-separated)</FormLabel>
                <FormControl>
                  <Input
                    id="subjects"
                    placeholder="Mathematics, Physics, Chemistry"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel>Payment Method</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="classRate"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="classRate">Class Rate ($)</FormLabel>
                <FormControl>
                  <Input
                    id="classRate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 50.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit">Add Student</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default StudentForm;
