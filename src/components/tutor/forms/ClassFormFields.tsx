
import React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';

interface FormFieldsProps {
  form: UseFormReturn<any, any, any>;
}

export const TitleField: React.FC<FormFieldsProps> = ({ form }) => (
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
);

export const DateField: React.FC<FormFieldsProps> = ({ form }) => (
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
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const TimeField: React.FC<FormFieldsProps & { name: "startTime" | "endTime", label: string }> = ({ form, name, label }) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input type="time" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const SubjectField: React.FC<FormFieldsProps> = ({ form }) => (
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
);

export const ZoomLinkField: React.FC<FormFieldsProps> = ({ form }) => (
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
);

export const NotesField: React.FC<FormFieldsProps> = ({ form }) => (
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
);
