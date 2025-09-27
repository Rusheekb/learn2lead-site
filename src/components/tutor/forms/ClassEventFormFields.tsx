import React from 'react';
import { format } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface ClassEventFormFieldsProps {
  formData: Partial<ClassEvent>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<ClassEvent>>>;
  errors?: Record<string, string>;
  readOnlyFields?: string[];
}

const subjects = [
  'Mathematics',
  'English',
  'Science',
  'History',
  'Geography',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Art',
  'Music',
  'Physical Education',
  'Foreign Language',
  'Economics',
  'Business Studies',
  'Other',
];

const ClassEventFormFields: React.FC<ClassEventFormFieldsProps> = ({
  formData,
  setFormData,
  errors = {},
  readOnlyFields = []
}) => {
  const isReadOnly = (field: string) => readOnlyFields.includes(field);
  const hasError = (field: string) => !!errors[field];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title || ''}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          placeholder="Enter class title"
          required
          readOnly={isReadOnly('title')}
          className={hasError('title') ? 'border-red-300' : ''}
        />
        {hasError('title') && (
          <p className="text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Select
          value={formData.subject || ''}
          onValueChange={(value) =>
            setFormData({ ...formData, subject: value })
          }
          disabled={isReadOnly('subject')}
        >
          <SelectTrigger className={hasError('subject') ? 'border-red-300' : ''}>
            <SelectValue placeholder="Select Subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasError('subject') && (
          <p className="text-sm text-red-600">{errors.subject}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={isReadOnly('date')}
              className={cn(
                'w-full justify-start text-left font-normal',
                !formData.date && 'text-muted-foreground',
                hasError('date') && 'border-red-300'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.date ? format(formData.date as Date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.date as Date}
              onSelect={(date) => {
                if (date) {
                  setFormData({ ...formData, date });
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {hasError('date') && (
          <p className="text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      {/* Time slots */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time *</Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime || ''}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              required
              readOnly={isReadOnly('startTime')}
              className={hasError('startTime') ? 'border-red-300' : ''}
            />
            {hasError('startTime') && (
              <p className="text-sm text-red-600">{errors.startTime}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">End Time *</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime || ''}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              required
              readOnly={isReadOnly('endTime')}
              className={hasError('endTime') ? 'border-red-300' : ''}
            />
            {hasError('endTime') && (
              <p className="text-sm text-red-600">{errors.endTime}</p>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Link */}
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="zoomLink">Zoom Link</Label>
        <Input
          id="zoomLink"
          value={formData.zoomLink || ''}
          onChange={(e) =>
            setFormData({ ...formData, zoomLink: e.target.value })
          }
          placeholder="https://zoom.us/j/..."
          readOnly={isReadOnly('zoomLink')}
          className={hasError('zoomLink') ? 'border-red-300' : ''}
        />
        {hasError('zoomLink') && (
          <p className="text-sm text-red-600">{errors.zoomLink}</p>
        )}
      </div>

      {/* Notes */}
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          placeholder="Class details, topics to cover, etc."
          rows={4}
          readOnly={isReadOnly('notes')}
          className={hasError('notes') ? 'border-red-300' : ''}
        />
        {hasError('notes') && (
          <p className="text-sm text-red-600">{errors.notes}</p>
        )}
      </div>
    </div>
  );
};

export default ClassEventFormFields;