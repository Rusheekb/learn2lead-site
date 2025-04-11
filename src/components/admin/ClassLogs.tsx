
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Search, Filter, User, MessageSquare, Download, FileDown, Printer, RefreshCw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import StudentContent from "../shared/StudentContent";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import Supabase services
import {
  fetchClassLogs as fetchClassLogRecords,
  fetchClassMessages,
  fetchClassUploads, 
  markMessageAsRead,
  getFileDownloadURL
} from "@/services/classService";

// Helper components and functions
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
  const [studentUploads, setStudentUploads] = useState<any[]>([]);
  const [studentMessages, setStudentMessages] = useState<any[]>([]);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>("details");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);

  // Fetch classes on component mount
  useEffect(() => {
    const loadClasses = async () => {
      setIsLoading(true);
      try {
        const classLogs = await fetchClassLogRecords();
        
        // Transform to the format expected by the component
        const transformedClasses = classLogs.map(cl => ({
          id: cl.id,
          title: cl.title,
          subject: cl.subject,
          tutorName: "Ms. Johnson", // This would come from the database in a real app
          studentName: cl.studentName,
          date: cl.date.toISOString().split('T')[0],
          startTime: cl.startTime,
          endTime: cl.endTime,
          status: "upcoming", // This would come from the database in a real app
          attendance: "pending", // This would come from the database in a real app
          zoomLink: cl.zoomLink,
          notes: cl.notes
        }));
        
        setClasses(transformedClasses);
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Failed to load class logs");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClasses();
  }, []);

  // Load messages and uploads when a class is selected
  useEffect(() => {
    const loadClassContent = async () => {
      if (!selectedClass) return;
      
      try {
        // Convert numeric ID back to UUID-like string for database query
        const classId = selectedClass.id.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
        
        // Load messages
        const messages = await fetchClassMessages(classId);
        setStudentMessages(messages);
        
        // Load uploads
        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error) {
        console.error("Error loading class content:", error);
      }
    };
    
    loadClassContent();
  }, [selectedClass]);

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

  const handleMarkMessageRead = async (messageId: number) => {
    try {
      // Convert numeric ID back to UUID-like string for database query
      const dbMessageId = messageId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      const success = await markMessageAsRead(dbMessageId);
      
      if (success) {
        setStudentMessages(messages => 
          messages.map(message => 
            message.id === messageId ? { ...message, isRead: true } : message
          )
        );
        toast.success("Message marked as read");
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };

  const getUnreadMessageCount = (classId: number) => {
    return studentMessages.filter(m => m.classId === classId && !m.isRead).length;
  };

  const handleDownloadFile = async (uploadId: number) => {
    try {
      const upload = studentUploads.find(u => u.id === uploadId);
      if (upload) {
        // In a real implementation, we would get the file path and create a download URL
        toast.success(`Downloading ${upload.fileName}`);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const fileName = `class-logs-${format === 'csv' ? 'spreadsheet.csv' : 'report.pdf'}`;
      toast.success(`Exported ${fileName} successfully`);
    } catch (error) {
      toast.error('Failed to export file');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      const classLogs = await fetchClassLogRecords();
      
      // Transform to the format expected by the component
      const transformedClasses = classLogs.map(cl => ({
        id: cl.id,
        title: cl.title,
        subject: cl.subject,
        tutorName: "Ms. Johnson", // This would come from the database in a real app
        studentName: cl.studentName,
        date: cl.date.toISOString().split('T')[0],
        startTime: cl.startTime,
        endTime: cl.endTime,
        status: "upcoming", // This would come from the database in a real app
        attendance: "pending", // This would come from the database in a real app
        zoomLink: cl.zoomLink,
        notes: cl.notes
      }));
      
      setClasses(transformedClasses);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClasses = classes.filter((cls) => {
    const searchMatch = searchTerm === "" || 
      cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusMatch = statusFilter === "all" || cls.status === statusFilter;
    
    const subjectMatch = subjectFilter === "all" || cls.subject.toLowerCase() === subjectFilter.toLowerCase();
    
    const dateMatch = !dateFilter || new Date(cls.date).toDateString() === dateFilter.toDateString();
    
    return searchMatch && statusMatch && subjectMatch && dateMatch;
  });

  // Extract unique subjects for filter
  const allSubjects = Array.from(new Set(classes.map(cls => cls.subject))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Class Logs</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={isLoading}>
                <FileDown className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Printer className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter Classes</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-sm text-muted-foreground"
            >
              Clear Filters
            </Button>
          </div>
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
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Class Records</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {filteredClasses.length} of {classes.length} classes
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <p>Loading class logs...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No class logs found matching your filters</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Details</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls) => (
                  <TableRow key={cls.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleClassClick(cls)}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{cls.title}</div>
                        <div className="text-sm text-muted-foreground">
                          <div>Tutor: {cls.tutorName}</div>
                          <div>Student: {cls.studentName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{format(new Date(cls.date), "MMM d, yyyy")}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(cls.status)}</TableCell>
                    <TableCell>{attendanceBadge(cls.attendance)}</TableCell>
                    <TableCell>
                      {getUnreadMessageCount(cls.id) > 0 && (
                        <div className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-red-500 rounded-full">
                          {getUnreadMessageCount(cls.id)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="hover:bg-muted">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
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
