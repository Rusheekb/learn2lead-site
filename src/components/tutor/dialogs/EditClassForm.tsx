import React from 'react';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/types/tutorTypes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { editClassEventSchema } from '@/utils/classFormUtils';
import type { z } from 'zod';

interface EditClassFormProps {
  selectedEvent: ClassEvent;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCancel: () => void;
  onSave: () => void;
  students?: any[];
}

type EditClassFormValues = z.infer<typeof editClassEventSchema>;

const EditClassForm: React.FC<EditClassFormProps> = ({
  selectedEvent,
  newEvent,
  setNewEvent,
  onCancel,
  onSave,
  students,
}) => {
  // Parse the date from string if needed
  const eventDate = typeof selectedEvent.date === 'string' 
    ? new Date(selectedEvent.date) 
    : selectedEvent.date;

  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(editClassEventSchema),
    defaultValues: {
      title: selectedEvent.title,
      date: eventDate,
      startTime: selectedEvent.startTime || '',
      endTime: selectedEvent.endTime || '',
      subject: selectedEvent.subject || '',
      zoomLink: selectedEvent.zoomLink || '',
      notes: selectedEvent.notes || '',
    },
  });

  // Watch for form changes and update parent state
  React.useEffect(() => {
    const subscription = form.watch((value) => {
      setNewEvent({
        ...selectedEvent,
        ...value,
      });
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, selectedEvent, setNewEvent]);

  return (
    <div className="py-4">
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter class title" {...field} />
                </FormControl>
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

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={onSave}
              className="bg-tutoring-blue hover:bg-tutoring-blue/90"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditClassForm;
