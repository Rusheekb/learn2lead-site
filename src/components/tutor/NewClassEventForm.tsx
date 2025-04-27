
import React, { useState } from 'react';
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
import type { Student } from '@/types/sharedTypes';
import type { TutorStudentRelationship } from '@/services/relationships/types';

interface NewClassEventFormProps {
  newEvent: any;
  setNewEvent: (event: any) => void;
  students: Student[];
  relationships: TutorStudentRelationship[];
  selectedRelId: string;
  setSelectedRelId: (id: string) => void;
}

const NewClassEventForm: React.FC<NewClassEventFormProps> = ({
  newEvent,
  setNewEvent,
  students,
  relationships,
  selectedRelId,
  setSelectedRelId,
}) => {
  return (
    <form className="space-y-4">
      <div>
        <Label>Class Title</Label>
        <Input
          placeholder="Enter class title"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Student</Label>
        <Select value={selectedRelId} onValueChange={setSelectedRelId}>
          <SelectTrigger>
            <SelectValue placeholder="Select student" />
          </SelectTrigger>
          <SelectContent>
            {relationships.map(rel => {
              const student = students.find(s => s.id === rel.student_id);
              return (
                <SelectItem key={rel.id} value={rel.id}>
                  {student?.name ?? 'Unknown Student'}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !newEvent.date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {newEvent.date ? format(newEvent.date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={newEvent.date}
              onSelect={(date) => setNewEvent({ ...newEvent, date })}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Start Time</Label>
        <Input
          type="time"
          value={newEvent.startTime}
          onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>End Time</Label>
        <Input
          type="time"
          value={newEvent.endTime}
          onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Subject</Label>
        <Input
          placeholder="Enter subject"
          value={newEvent.subject}
          onChange={(e) => setNewEvent({ ...newEvent, subject: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Zoom Meeting Link</Label>
        <Input
          placeholder="Enter Zoom meeting link"
          value={newEvent.zoomLink}
          onChange={(e) => setNewEvent({ ...newEvent, zoomLink: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Input
          placeholder="Add any notes (optional)"
          value={newEvent.notes}
          onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
        />
      </div>
    </form>
  );
};

export default NewClassEventForm;
