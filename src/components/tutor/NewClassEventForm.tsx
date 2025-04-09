
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "@/types/tutorTypes";

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
    <div className="grid gap-4 py-4">
      <div>
        <Label htmlFor="title">Class Title</Label>
        <Input
          id="title"
          value={newEvent.title}
          onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
          placeholder="Enter class title"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="student">Student</Label>
          <Select
            onValueChange={(value) => setNewEvent({...newEvent, studentId: value})}
          >
            <SelectTrigger id="student">
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
        
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Select
            onValueChange={(value) => setNewEvent({...newEvent, subject: value})}
          >
            <SelectTrigger id="subject">
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
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <div className="border rounded-md mt-1">
            <Calendar
              mode="single"
              selected={newEvent.date}
              onSelect={(date) => date && setNewEvent({...newEvent, date})}
              className="p-0"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={newEvent.startTime}
              onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={newEvent.endTime}
              onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
            />
          </div>
        </div>
      </div>
      
      <div>
        <Label htmlFor="zoomLink">Zoom Meeting Link</Label>
        <Input
          id="zoomLink"
          type="url"
          value={newEvent.zoomLink}
          onChange={(e) => setNewEvent({...newEvent, zoomLink: e.target.value})}
          placeholder="https://zoom.us/j/..."
        />
      </div>
      
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={newEvent.notes}
          onChange={(e) => setNewEvent({...newEvent, notes: e.target.value})}
          placeholder="Add any notes or instructions for this class"
        />
      </div>
    </div>
  );
};

export default NewClassEventForm;
