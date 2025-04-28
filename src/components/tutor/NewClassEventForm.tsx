import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Student } from '@/types/sharedTypes';
import type { TutorStudentRelationship } from '@/services/relationships/types';
import { newClassEventSchema } from '@/utils/classFormUtils';
import type { z } from 'zod';

const schema = newClassEventSchema();
type ClassEventFormValues = z.infer<typeof schema>;

interface NewClassEventFormProps {
  newEvent: any;
  setNewEvent: (event: any) => void;
  assignedStudents: Student[];
  relationships: TutorStudentRelationship[];
  selectedRelId: string;
  setSelectedRelId: (id: string) => void;
}

const NewClassEventForm: React.FC<NewClassEventFormProps> = ({
  newEvent,
  setNewEvent,
  assignedStudents,
  relationships,
  selectedRelId,
  setSelectedRelId,
}) => {
  const form = useForm<ClassEventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: newEvent.title || '',
      relationshipId: selectedRelId || '',
      date: newEvent.date || new Date(),
      startTime: newEvent.startTime || '',
      endTime: newEvent.endTime || '',
      subject: newEvent.subject || '',
      zoomLink: newEvent.zoomLink || '',
      notes: newEvent.notes || '',
    },
  });

  // Watch for form changes and update parent state
  React.useEffect(() => {
    const subscription = form.watch((value: Partial<ClassEventFormValues>) => {
      const selectedRel = relationships.find(r => r.id === value.relationshipId);
      const student = assignedStudents.find(s => s.id === selectedRel?.student_id);
      
      setNewEvent({
        ...newEvent,
        title: value.title,
        date: value.date,
        startTime: value.startTime,
        endTime: value.endTime,
        studentId: selectedRel?.student_id || '',
        studentName: student?.name || '',
        subject: value.subject,
        zoomLink: value.zoomLink,
        notes: value.notes,
      });

      if (value.relationshipId !== selectedRelId) {
        setSelectedRelId(value.relationshipId || '');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, setNewEvent, newEvent, relationships, assignedStudents, selectedRelId, setSelectedRelId]);

  return (
    <Form {...form}>
      <form className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter class title"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Enter subject" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="zoomLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zoom Meeting Link</FormLabel>
              <FormControl>
                <Input placeholder="Enter Zoom meeting link" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Add any notes (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default NewClassEventForm;
