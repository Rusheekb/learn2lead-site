
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { StudentNote } from "@/types/sharedTypes";

interface StudentNotesProps {
  notes: StudentNote[];
  onAddNote: (title: string, content: string) => void;
}

const StudentNotes: React.FC<StudentNotesProps> = ({ notes, onAddNote }) => {
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  
  const handleAddNote = () => {
    if (newNote.title.trim() && newNote.content.trim()) {
      onAddNote(newNote.title, newNote.content);
      setNewNote({ title: "", content: "" });
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="border rounded-md p-4">
              <h4 className="font-medium flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {note.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(note.date).toLocaleDateString()}
              </p>
              <p className="mt-2 text-gray-700">{note.content}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No notes for this student yet</p>
          </div>
        )}
      </div>
      
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">Add New Note</h4>
        <div className="space-y-3">
          <div>
            <Label htmlFor="note-title">Title</Label>
            <Input 
              id="note-title" 
              value={newNote.title}
              onChange={(e) => setNewNote({...newNote, title: e.target.value})}
              placeholder="Note title"
            />
          </div>
          <div>
            <Label htmlFor="note-content">Content</Label>
            <Textarea 
              id="note-content" 
              value={newNote.content}
              onChange={(e) => setNewNote({...newNote, content: e.target.value})}
              placeholder="Note content"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddNote}>Save Note</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentNotes;
