import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const NewClassEventForm = ({
  newEvent,
  setNewEvent,
  students,
  relationships,
  selectedRelId,
  setSelectedRelId,
}: NewClassEventFormProps) => {
  const [classTitle, setClassTitle] = useState(newEvent?.title || '');
  const [selectedSubject, setSelectedSubject] = useState(newEvent?.subject || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    newEvent?.start_time ? new Date(newEvent.start_time) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    newEvent?.end_time ? new Date(newEvent.end_time) : undefined
  );
  const [zoomLink, setZoomLink] = useState(newEvent?.zoom_link || '');
  const [notes, setNotes] = useState(newEvent?.notes || '');

  useEffect(() => {
    setNewEvent({
      ...newEvent,
      title: classTitle,
      subject: selectedSubject,
      start_time: startDate ? startDate.toISOString() : null,
      end_time: endDate ? endDate.toISOString() : null,
      zoom_link: zoomLink,
      notes: notes,
    });
  }, [classTitle, selectedSubject, startDate, endDate, zoomLink, notes, setNewEvent, newEvent]);

  const subjects = ['Math', 'Science', 'English', 'History', 'Programming'];

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="classTitle">Class Title</Label>
        <Input
          id="classTitle"
          placeholder="Enter class title"
          value={classTitle}
          onChange={(e) => setClassTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Student</Label>
        <Select
          value={selectedRelId}
          onValueChange={(value) => {
            setSelectedRelId(value);
            const rel = relationships.find(r => r.id === value);
            setNewEvent({
              ...newEvent,
              relationship_id: value,
              subject: rel?.subject || ''
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select student" />
          </SelectTrigger>
          <SelectContent>
            {relationships.map(rel => {
              const student = students.find(s => s.id === rel.student_id);
              return (
                <SelectItem key={rel.id} value={rel.id}>
                  {student?.name || 'Unknown Student'}
                  {rel.subject ? ` (${rel.subject})` : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zoomLink">Zoom Link (Optional)</Label>
        <Input
          id="zoomLink"
          placeholder="Enter Zoom link"
          value={zoomLink}
          onChange={(e) => setZoomLink(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Enter any additional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
};

export default NewClassEventForm;
