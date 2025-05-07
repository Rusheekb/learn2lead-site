
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
        <FormLabel>Class Title <span className="text-red-500">*</span></FormLabel>
        <FormControl>
          <Input 
            placeholder="Enter class title (min 3 characters)" 
            className="bg-white"
            {...field} 
          />
        </FormControl>
        <FormMessage className="text-red-500 text-xs" />
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
        <FormLabel>Date <span className="text-red-500">*</span></FormLabel>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal bg-white',
                  !field.value && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white" align="start">
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              initialFocus
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <FormMessage className="text-red-500 text-xs" />
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
        <FormLabel>{label} <span className="text-red-500">*</span></FormLabel>
        <FormControl>
          <Input 
            type="time" 
            className="bg-white"
            {...field} 
          />
        </FormControl>
        <FormMessage className="text-red-500 text-xs" />
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
        <FormLabel>Subject <span className="text-red-500">*</span></FormLabel>
        <FormControl>
          <Input 
            placeholder="Enter subject" 
            className="bg-white"
            {...field} 
          />
        </FormControl>
        <FormMessage className="text-red-500 text-xs" />
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
        <FormLabel>Zoom Meeting Link <span className="text-red-500">*</span></FormLabel>
        <FormControl>
          <Input 
            placeholder="Enter Zoom meeting URL (https://...)" 
            className="bg-white"
            {...field} 
          />
        </FormControl>
        <FormMessage className="text-red-500 text-xs" />
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
          <Input 
            placeholder="Add any notes (optional)" 
            className="bg-white"
            {...field} 
          />
        </FormControl>
        <FormMessage className="text-red-500 text-xs" />
      </FormItem>
    )}
  />
);
