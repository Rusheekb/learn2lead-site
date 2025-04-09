
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageSquare, User, Calendar, ArrowRight } from "lucide-react";
import StudentContent, { StudentUpload, StudentMessage } from "../shared/StudentContent";
import { mockStudentMessages, mockStudentUploads } from "../shared/mock-data";
import ClassContentUpload from "../shared/ClassContentUpload";
import { toast } from "sonner";

// Mock class data matching the structure in ClassLogs.tsx
const mockClasses = [
  {
    id: 1,
    title: "Algebra Fundamentals",
    subject: "Mathematics",
    tutorName: "Ms. Johnson",
    studentName: "Alex Johnson",
    date: "2025-04-10",
    startTime: "15:00",
    endTime: "16:00",
    status: "upcoming",
    attendance: "pending",
    zoomLink: "https://zoom.us/j/123456789",
    notes: "Covering quadratic equations."
  },
  {
    id: 2,
    title: "Chemistry Lab Prep",
    subject: "Science",
    tutorName: "Mr. Chen",
    studentName: "Jamie Smith",
    date: "2025-04-11",
    startTime: "14:00",
    endTime: "15:30",
    status: "upcoming",
    attendance: "pending",
    zoomLink: "https://zoom.us/j/987654321",
    notes: ""
  }
];

const ClassStudentActivity: React.FC = () => {
  const [studentUploads, setStudentUploads] = useState(mockStudentUploads);
  const [studentMessages, setStudentMessages] = useState(mockStudentMessages);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  
  // Handle file upload
  const handleFileUpload = (classId: number, file: File, note: string) => {
    // In a real app, this would upload to a server
    const newUpload: StudentUpload = {
      id: studentUploads.length + 1,
      classId,
      studentName: "Current Student", // In a real app, this would be the logged-in user
      fileName: file.name,
      fileSize: `${Math.round(file.size / 1024)} KB`,
      uploadDate: new Date().toISOString().split('T')[0],
      note: note || undefined
    };
    
    setStudentUploads([...studentUploads, newUpload]);
    toast.success("File uploaded successfully");
  };
  
  // Handle sending a message
  const handleSendMessage = (classId: number, messageText: string) => {
    // In a real app, this would send to a backend
    const newMessage = {
      id: studentMessages.length + 1,
      classId,
      studentName: "Current Student", // In a real app, this would be the logged-in user
      message: messageText,
      timestamp: new Date().toLocaleString(),
      isRead: false
    };
    
    setStudentMessages([...studentMessages, newMessage]);
    toast.success("Message sent successfully");
  };
  
  // Handle viewing class details
  const handleViewClass = (cls: any) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Upcoming Classes</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Tutor</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockClasses.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cls.title}</p>
                      <p className="text-sm text-gray-500">{cls.subject}</p>
                    </div>
                  </TableCell>
                  <TableCell>{cls.date}</TableCell>
                  <TableCell>{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</TableCell>
                  <TableCell>{cls.tutorName}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewClass(cls)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleViewClass(cls)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Class Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedClass?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedClass && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Class Details</TabsTrigger>
                <TabsTrigger value="content">Content & Messages</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                    <p>{selectedClass.subject}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Tutor</h4>
                    <p>{selectedClass.tutorName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Date</h4>
                    <p>{selectedClass.date}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Time</h4>
                    <p>{formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Zoom Link</h4>
                  <a 
                    href={selectedClass.zoomLink}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-tutoring-blue hover:underline"
                  >
                    {selectedClass.zoomLink}
                  </a>
                </div>
                
                {selectedClass.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                    <p>{selectedClass.notes}</p>
                  </div>
                )}
                
                <ClassContentUpload 
                  classId={selectedClass.id}
                  onUpload={(file, note) => handleFileUpload(selectedClass.id, file, note)}
                  onMessage={(message) => handleSendMessage(selectedClass.id, message)}
                />
              </TabsContent>
              
              <TabsContent value="content" className="space-y-4 pt-4">
                <StudentContent 
                  classId={selectedClass.id}
                  uploads={studentUploads}
                  messages={studentMessages}
                />
                
                <div className="pt-4 border-t">
                  <ClassContentUpload 
                    classId={selectedClass.id}
                    onUpload={(file, note) => handleFileUpload(selectedClass.id, file, note)}
                    onMessage={(message) => handleSendMessage(selectedClass.id, message)}
                  />
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

export default ClassStudentActivity;
