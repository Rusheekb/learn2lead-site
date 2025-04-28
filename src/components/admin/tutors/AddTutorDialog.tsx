
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tutor } from '@/types/tutorTypes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface AddTutorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTutor: (tutor: Tutor) => void;
}

// Define the schema for tutor validation
const tutorSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  subjects: z.string().min(1, { message: 'At least one subject is required' }),
  hourlyRate: z.string()
    .refine(val => !isNaN(Number(val)), { message: 'Hourly rate must be a number' })
    .refine(val => Number(val) >= 0, { message: 'Hourly rate must be 0 or greater' }),
});

type TutorFormValues = z.infer<typeof tutorSchema>;

const AddTutorDialog: React.FC<AddTutorDialogProps> = ({
  open,
  onOpenChange,
  onAddTutor,
}) => {
  const { toast } = useToast();

  const form = useForm<TutorFormValues>({
    resolver: zodResolver(tutorSchema),
    defaultValues: {
      name: '',
      email: '',
      subjects: '',
      hourlyRate: '',
    },
  });

  const handleSubmit = (values: TutorFormValues) => {
    const newTutor = {
      id: Date.now().toString(),
      name: values.name,
      email: values.email,
      subjects: values.subjects.split(',').map((s) => s.trim()),
      rating: 5,
      classes: 0,
      hourlyRate: parseInt(values.hourlyRate || '0'),
    };

    onAddTutor(newTutor);
    toast({
      title: 'Tutor Added',
      description: 'New tutor has been successfully added to the system.',
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Tutor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
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
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="hourlyRate">Hourly Rate ($)</FormLabel>
                    <FormControl>
                      <Input
                        id="hourlyRate"
                        type="number"
                        min="0"
                        placeholder="50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Add Tutor</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTutorDialog;
