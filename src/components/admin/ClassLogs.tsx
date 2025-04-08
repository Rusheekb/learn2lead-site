import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Search, Filter, User, MessageSquare } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import StudentContent from "../shared/StudentContent";
import { mockStudentMessages, mockStudentUploads } from "../shared/mock-data";
import { toast } from "sonner";

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
    status: "completed",
    attendance: "attended",
    zoomLink: "https://zoom.us/j/123456789",
    notes: "Covered quadratic equations. Student shows good progress."
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
  },
  {
    id: 3,
    title: "Essay Writing Workshop",
    subject: "English",
    tutorName: "Dr. Martinez",
    studentName: "Taylor Brown",
    date: "2025-04-05",
    startTime: "16:00",
    endTime: "17:00",
    status: "completed",
    attendance: "missed",
    zoomLink: "https://zoom.us/j/567891234",
    notes: "Student did not attend. Need to reschedule."
  },
  {
    id: 4,
    title: "World War II Discussion",
    subject: "History",
    tutorName: "Prof. Wilson",
    studentName: "Taylor Brown",
    date: "2025-04-12",
    startTime: "13:00",
    endTime: "14:30",
    status: "upcoming",
    attendance: "pending",
    zoomLink: "https://zoom.us/j/456123789",
    notes: ""
  },
  {
    id: 5,
    title: "Calculus Review",
    subject: "Mathematics",
    tutorName: "Ms. Johnson",
    studentName: "Alex Johnson",
    date: "2025-04-03",
    startTime: "15:00",
    endTime: "16:00",
    status: "completed",
    attendance: "attended",
    zoomLink: "https://zoom.us/j/321654987",
    notes: "Excellent progress with integrals."
  }
];

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Completed</span>;
    case 'upcoming':
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Upcoming</span>;
    case 'cancelled':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Cancelled</span>;
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
  }
};

const attendanceBadge = (attendance: string) => {
  switch (attendance) {
    case 'attended':
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Attended</span>;
    case 'missed':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Missed</span>;
    case 'pending':
      return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Pending</span>;
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{attendance}</span>;
  }
};

const ClassLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [studentUploads] = useState(mockStudentUploads);
  const [studentMessages, setStudentMessages] = useState(mockStudentMessages);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>("details");

  const filteredClasses = mockClasses.filter((cls) => {
    const searchMatch = searchTerm === "" || 
      cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusMatch = statusFilter === "all" || cls.status === statusFilter;
    
    const subjectMatch = subjectFilter === "all" || cls.subject.toLowerCase() === subjectFilter.toLowerCase();
    
    const dateMatch = !dateFilter || new Date(cls.date).toDateString() === dateFilter.toDateString();
    
    return searchMatch && statusMatch && subjectMatch && dateMatch;
  });

  const handleClassClick = (cls: any) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
  };

  const formatTime = (timeString: string) => {
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSubjectFilter("all");
    setDateFilter(undefined);
  };

  const handleMarkMessageRead = (messageId: number) => {
    setStudentMessages(messages => 
      messages.map(message => 
        message.id === messageId ? { ...message, isRead: true } : message
      )
    );
    toast.success("Message marked as read");
  };

  const getUnreadMessageCount = (classId: number) => {
    return studentMessages.filter(m => m.classId === classId && !m.isRead).length;
  };

  const handleDownloadFile = (uploadId: number) => {
    const upload = studentUploads.find(u => u.id === uploadId);
    if (upload) {
      toast.success(`Downloading ${upload.fileName}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Class Logs</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Filter Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by title, tutor or student"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="mathematics">Mathematics</SelectItem>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="history">History</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              <span>Clear Filters</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Classes</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.length > 0 ? (
                    filteredClasses.map((cls) => (
                      <TableRow 
                        key={cls.id} 
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <TableCell className="font-medium">{cls.title}</TableCell>
                        <TableCell>{cls.subject}</TableCell>
                        <TableCell>{cls.tutorName}</TableCell>
                        <TableCell>{cls.studentName}</TableCell>
                        <TableCell>{new Date(cls.date).toLocaleDateString()}</TableCell>
                        <TableCell>{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</TableCell>
                        <TableCell>{statusBadge(cls.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleClassClick(cls)}>
                              View
                            </Button>
                            {getUnreadMessageCount(cls.id) > 0 && (
                              <span className="bg-red-100 text-red-800 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {getUnreadMessageCount(cls.id)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No classes match your filter criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.filter(cls => cls.status === 'completed').map((cls) => (
                    <TableRow 
                      key={cls.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleClassClick(cls)}
                    >
                      <TableCell className="font-medium">{cls.title}</TableCell>
                      <TableCell>{cls.subject}</TableCell>
                      <TableCell>{cls.tutorName}</TableCell>
                      <TableCell>{cls.studentName}</TableCell>
                      <TableCell>{new Date(cls.date).toLocaleDateString()}</TableCell>
                      <TableCell>{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</TableCell>
                      <TableCell>{attendanceBadge(cls.attendance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upcoming">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.filter(cls => cls.status === 'upcoming').map((cls) => (
                    <TableRow 
                      key={cls.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleClassClick(cls)}
                    >
                      <TableCell className="font-medium">{cls.title}</TableCell>
                      <TableCell>{cls.subject}</TableCell>
                      <TableCell>{cls.tutorName}</TableCell>
                      <TableCell>{cls.studentName}</TableCell>
                      <TableCell>{new Date(cls.date).toLocaleDateString()}</TableCell>
                      <TableCell>{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedClass?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedClass && (
            <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Class Details</TabsTrigger>
                <TabsTrigger value="student-content">
                  Student Content
                  {getUnreadMessageCount(selectedClass.id) > 0 && (
                    <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-800">
                      {getUnreadMessageCount(selectedClass.id)}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                    <p>{selectedClass.subject}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <div>{statusBadge(selectedClass.status)}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Tutor</h4>
                    <p>{selectedClass.tutorName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Student</h4>
                    <p>{selectedClass.studentName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Date</h4>
                    <p>{new Date(selectedClass.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Time</h4>
                    <p>{formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Attendance</h4>
                    <div>{attendanceBadge(selectedClass.attendance)}</div>
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
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                  <p className="mt-1 text-gray-700">
                    {selectedClass.notes || "No notes recorded for this class."}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="student-content" className="space-y-4 pt-4">
                <StudentContent 
                  classId={selectedClass.id}
                  uploads={studentUploads}
                  messages={studentMessages}
                  onDownload={handleDownloadFile}
                  onMarkAsRead={handleMarkMessageRead}
                />
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

export default ClassLogs;
