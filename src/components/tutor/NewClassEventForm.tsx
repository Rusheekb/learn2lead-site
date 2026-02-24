
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
import { Switch } from '@/components/ui/switch';
import { addWeeks, eachWeekOfInterval, isBefore, isAfter, startOfDay } from 'date-fns';

interface StudentOption {
  id: string;
  name: string;
  relationshipId: string;
}

interface NewClassEventFormProps {
  newEvent: Partial<ClassEvent>;
  setNewEvent: React.Dispatch<React.SetStateAction<Partial<ClassEvent>>>;
  studentOptions: StudentOption[];
  onStudentSelect: (studentId: string) => void;
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

const NewClassEventForm: React.FC<NewClassEventFormProps> = ({
  newEvent,
  setNewEvent,
  studentOptions,
  onStudentSelect,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={newEvent.title || ''}
          onChange={(e) =>
            setNewEvent({ ...newEvent, title: e.target.value })
          }
          placeholder="Enter class title"
          required
          className={!newEvent.title ? 'border-red-300' : ''}
        />
        {!newEvent.title && (
          <p className="text-sm text-red-600">Title is required</p>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Select
          value={newEvent.subject || ''}
          onValueChange={(value) =>
            setNewEvent({ ...newEvent, subject: value })
          }
          required
        >
          <SelectTrigger className={`w-full ${!newEvent.subject ? 'border-red-300' : ''}`}>
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
        {!newEvent.subject && (
          <p className="text-sm text-red-600">Subject is required</p>
        )}
      </div>

      {/* Student */}
      <div className="space-y-2">
        <Label htmlFor="student">Student *</Label>
        <Select 
          value={newEvent.studentId || ''} 
          onValueChange={(value) => onStudentSelect(value)}
          required
        >
          <SelectTrigger className={`w-full ${!newEvent.studentId ? 'border-red-300' : ''}`}>
            <SelectValue placeholder="Select Student" />
          </SelectTrigger>
          <SelectContent>
            {studentOptions.length > 0 ? (
              studentOptions.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-students" disabled>
                No students available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {!newEvent.studentId && (
          <p className="text-sm text-red-600">Please select a student</p>
        )}
        {newEvent.relationshipId && (
          <p className="text-xs text-gray-500">Relationship ID: {newEvent.relationshipId}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !newEvent.date && 'text-muted-foreground',
                !newEvent.date ? 'border-red-300' : ''
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {newEvent.date ? format(newEvent.date as Date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={newEvent.date as Date}
              onSelect={(date) => {
                if (date) {
                  // Ensure we use the local date without timezone conversion
                  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  setNewEvent({ ...newEvent, date: localDate });
                }
              }}
              disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} // Disable past dates
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {!newEvent.date && (
          <p className="text-sm text-red-600">Date is required</p>
        )}
      </div>

      {/* Time slots - horizontal layout */}
      <div className="md:col-span-2 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="time"
            value={newEvent.startTime || ''}
            onChange={(e) =>
              setNewEvent({ ...newEvent, startTime: e.target.value })
            }
            required
            className={!newEvent.startTime ? 'border-red-300' : ''}
          />
          {!newEvent.startTime && (
            <p className="text-sm text-red-600">Start time is required</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="time"
            value={newEvent.endTime || ''}
            onChange={(e) =>
              setNewEvent({ ...newEvent, endTime: e.target.value })
            }
            required
            className={!newEvent.endTime ? 'border-red-300' : ''}
          />
          {!newEvent.endTime && (
            <p className="text-sm text-red-600">End time is required</p>
          )}
        </div>
      </div>

      {/* Zoom Link */}
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="zoomLink">Zoom Link (optional)</Label>
        <Input
          id="zoomLink"
          value={newEvent.zoomLink || ''}
          onChange={(e) =>
            setNewEvent({ ...newEvent, zoomLink: e.target.value })
          }
          placeholder="https://zoom.us/j/..."
        />
      </div>

      {/* Recurrence Section */}
      <div className="md:col-span-2 space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="recurring" className="cursor-pointer">Repeat weekly</Label>
          <Switch
            id="recurring"
            checked={newEvent.recurring || false}
            onCheckedChange={(checked) =>
              setNewEvent({ ...newEvent, recurring: checked, recurringUntil: checked ? addWeeks(newEvent.date as Date || new Date(), 4) : null })
            }
            disabled={!newEvent.date}
          />
        </div>

        {newEvent.recurring && newEvent.date && (
          <>
            <div className="space-y-2">
              <Label htmlFor="recurringUntil">Repeat until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !(newEvent as any).recurringUntil && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {(newEvent as any).recurringUntil
                      ? format((newEvent as any).recurringUntil as Date, 'PPP')
                      : <span>Pick an end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={(newEvent as any).recurringUntil as Date | undefined}
                    onSelect={(date) => {
                      if (date) {
                        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        setNewEvent({ ...newEvent, recurringUntil: localDate } as any);
                      }
                    }}
                    disabled={(date) => {
                      const startDate = startOfDay(newEvent.date as Date);
                      const maxDate = addWeeks(startDate, 12);
                      return isBefore(date, addWeeks(startDate, 1)) || isAfter(date, maxDate);
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(() => {
              const startDate = startOfDay(newEvent.date as Date);
              const endDate = newEvent.recurringUntil as Date | undefined;
              if (!endDate) return null;
              const weeks = eachWeekOfInterval(
                { start: startDate, end: endDate },
                { weekStartsOn: (startDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6) }
              );
              // eachWeekOfInterval may include the start week; count dates that match the weekday
              const count = Math.min(
                Array.from({ length: 12 }, (_, i) => addWeeks(startDate, i))
                  .filter((d) => !isAfter(d, endDate)).length,
                12
              );
              const dayName = format(startDate, 'EEEE');
              return (
                <p className="text-sm text-muted-foreground">
                  This will create <strong>{count} class{count !== 1 ? 'es' : ''}</strong> on {dayName}s
                  {newEvent.startTime && ` at ${newEvent.startTime}`}.
                </p>
              );
            })()}
          </>
        )}
      </div>

      {/* Notes */}
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={newEvent.notes || ''}
          onChange={(e) =>
            setNewEvent({ ...newEvent, notes: e.target.value })
          }
          placeholder="Class details, topics to cover, etc."
          rows={4}
        />
      </div>
    </div>
  );
};

export default NewClassEventForm;
