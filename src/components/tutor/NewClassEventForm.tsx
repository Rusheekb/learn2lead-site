
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Student } from "@/types/tutorTypes";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface NewClassEventFormProps {
  newEvent: {
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    studentId: string;
    subject: string;
    zoomLink: string;
    notes: string;
    recurring: boolean;
    recurringDays: string[];
  };
  setNewEvent: React.Dispatch<React.SetStateAction<any>>;
  students: Student[];
}

const NewClassEventForm: React.FC<NewClassEventFormProps> = ({ 
  newEvent, 
  setNewEvent,
  students 
}) => {
  return (
    <div className="grid gap-6 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Class Title</Label>
        <Input
          id="title"
          value={newEvent.title}
          onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
          placeholder="Enter class title"
          className="w-full"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="student">Student</Label>
          <Select
            value={newEvent.studentId}
            onValueChange={(value) => setNewEvent({...newEvent, studentId: value})}
          >
            <SelectTrigger id="student" className="w-full">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id.toString()}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select
            value={newEvent.subject}
            onValueChange={(value) => setNewEvent({...newEvent, subject: value})}
          >
            <SelectTrigger id="subject" className="w-full">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Science">Science</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="History">History</SelectItem>
              <SelectItem value="Languages">Languages</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !newEvent.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newEvent.date ? format(newEvent.date, "PPP") : <span>Select date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newEvent.date}
                onSelect={(date) => date && setNewEvent({...newEvent, date})}
                initialFocus
                className="rounded-md border"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <div className="relative">
              <Input
                id="startTime"
                type="time"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                className="w-full pl-10"
              />
              <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <div className="relative">
              <Input
                id="endTime"
                type="time"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                className="w-full pl-10"
              />
              <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="zoomLink">Zoom Meeting Link</Label>
        <Input
          id="zoomLink"
          type="url"
          value={newEvent.zoomLink}
          onChange={(e) => setNewEvent({...newEvent, zoomLink: e.target.value})}
          placeholder="https://zoom.us/j/..."
          className="w-full"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={newEvent.notes}
          onChange={(e) => setNewEvent({...newEvent, notes: e.target.value})}
          placeholder="Add any notes or instructions for this class"
          className="h-32 resize-none"
        />
      </div>
    </div>
  );
};

export default NewClassEventForm;
