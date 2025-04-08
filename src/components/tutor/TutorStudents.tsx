
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, MessageSquare, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock student data with messages and notes
const mockStudents = [
  { 
    id: 1, 
    name: "Alex Johnson", 
    email: "alex@example.com",
    subjects: ["Mathematics", "Physics"],
    progress: "Good progress in algebra, needs help with calculus",
    lastSession: "2025-04-01",
    nextSession: "2025-04-08"
  },
  { 
    id: 2, 
    name: "Jamie Smith", 
    email: "jamie@example.com",
    subjects: ["Chemistry", "Biology"],
    progress: "Excellent understanding of molecular structures",
    lastSession: "2025-04-03",
    nextSession: "2025-04-10"
  },
  { 
    id: 3, 
    name: "Taylor Brown", 
    email: "taylor@example.com",
    subjects: ["English", "History"],
    progress: "Working on essay structure and analysis",
    lastSession: "2025-04-06",
    nextSession: "2025-04-13"
  }
];

// Mock messages between tutor and students
const mockMessages = [
  {
    studentId: 1,
    messages: [
      { id: 1, sender: "student", text: "Hi, I'm having trouble with the homework problems 3-5.", timestamp: "2025-04-02T14:30:00" },
      { id: 2, sender: "tutor", text: "Let's go over them in our next session. Could you send me your work so far?", timestamp: "2025-04-02T15:05:00" },
      { id: 3, sender: "student", text: "Attached is what I've done so far. I'm stuck on problem 4.", timestamp: "2025-04-02T16:22:00" }
    ]
  },
  {
    studentId: 2,
    messages: [
      { id: 1, sender: "student", text: "When will we cover the periodic table?", timestamp: "2025-04-03T09:15:00" },
      { id: 2, sender: "tutor", text: "We'll cover that in our next session on Thursday. Please review chapter 4 beforehand.", timestamp: "2025-04-03T10:30:00" }
    ]
  },
  {
    studentId: 3,
    messages: [
      { id: 1, sender: "student", text: "I've revised my essay based on your feedback. Could you take a look?", timestamp: "2025-04-04T12:00:00" },
      { id: 2, sender: "tutor", text: "I'll review it tonight and provide feedback by tomorrow morning.", timestamp: "2025-04-04T13:45:00" },
      { id: 3, sender: "tutor", text: "Your revised essay is much improved! I've added a few more suggestions in the document.", timestamp: "2025-04-05T08:30:00" }
    ]
  }
];

// Mock notes about students
const mockNotes = [
  {
    studentId: 1,
    notes: [
      { id: 1, title: "Initial Assessment", content: "Strong foundation in basic algebra but struggles with word problems. Visual learning approach works best.", date: "2025-03-15" },
      { id: 2, title: "Progress Report - Q1", content: "Significant improvement in problem-solving. Still needs work on applications of derivatives.", date: "2025-04-01" }
    ]
  },
  {
    studentId: 2,
    notes: [
      { id: 1, title: "Learning Style", content: "Prefers hands-on experiments and practical applications. Excellent at memorization but needs help connecting concepts.", date: "2025-03-10" }
    ]
  },
  {
    studentId: 3,
    notes: [
      { id: 1, title: "Writing Assessment", content: "Strong vocabulary but struggling with essay structure and thesis development.", date: "2025-03-20" },
      { id: 2, title: "Progress - April", content: "Essays showing improved organization. Next focus: strengthening analytical arguments.", date: "2025-04-05" }
    ]
  }
];

const TutorStudents: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [newMessage, setNewMessage] = useState<string>("");
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  
  // Find messages and notes for selected student
  const studentMessages = mockMessages.find(m => m.studentId === selectedStudent?.id)?.messages || [];
  const studentNotes = mockNotes.find(n => n.studentId === selectedStudent?.id)?.notes || [];
  
  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
    setActiveTab("overview");
  };
  
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In a real app, this would send to a backend
      console.log("Sending message to student:", selectedStudent?.id, newMessage);
      setNewMessage("");
    }
  };
  
  const handleAddNote = () => {
    if (newNote.title.trim() && newNote.content.trim()) {
      // In a real app, this would save to a database
      console.log("Adding note for student:", selectedStudent?.id, newNote);
      setNewNote({ title: "", content: "" });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Students</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Student Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Next Session</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.subjects.join(", ")}</TableCell>
                  <TableCell>{new Date(student.nextSession).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleStudentSelect(student)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Student Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedStudent?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Email</h4>
                    <p>{selectedStudent.email}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Subjects</h4>
                    <p>{selectedStudent.subjects.join(", ")}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Last Session</h4>
                    <p>{new Date(selectedStudent.lastSession).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Next Session</h4>
                    <p>{new Date(selectedStudent.nextSession).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Progress Notes</h4>
                  <p className="mt-1 text-gray-700">{selectedStudent.progress}</p>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("messages")} 
                    className="flex items-center gap-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Messages</span>
                  </Button>
                  <Button onClick={() => setActiveTab("notes")} className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>Notes</span>
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="messages" className="space-y-4 pt-4">
                <div className="border rounded-md p-4 h-64 overflow-y-auto space-y-3">
                  {studentMessages.length > 0 ? (
                    studentMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex ${msg.sender === 'tutor' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.sender === 'tutor' 
                              ? 'bg-tutoring-blue text-white' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(msg.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No message history with this student</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage}>Send</Button>
                </div>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4 pt-4">
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {studentNotes.length > 0 ? (
                    studentNotes.map((note) => (
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
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorStudents;
