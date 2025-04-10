import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Student {
  id: number;
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  status: "active" | "inactive" | "pending";
  enrollDate: string;
  lastSession: string;
  paymentStatus: "paid" | "unpaid" | "overdue";
}

const mockStudents: Student[] = [
  {
    id: 1,
    name: "Emma Thompson",
    email: "emma@example.com",
    grade: "11th Grade",
    subjects: ["Calculus", "Physics"],
    status: "active",
    enrollDate: "2023-09-01",
    lastSession: "2025-04-07",
    paymentStatus: "paid"
  },
  {
    id: 2,
    name: "Noah Martinez",
    email: "noah@example.com",
    grade: "10th Grade",
    subjects: ["Chemistry", "Biology"],
    status: "active",
    enrollDate: "2023-10-15",
    lastSession: "2025-04-08",
    paymentStatus: "unpaid"
  },
  {
    id: 3,
    name: "Olivia Johnson",
    email: "olivia@example.com",
    grade: "12th Grade",
    subjects: ["English Literature", "History"],
    status: "inactive",
    enrollDate: "2023-08-20",
    lastSession: "2025-03-15",
    paymentStatus: "overdue"
  },
  {
    id: 4,
    name: "Liam Williams",
    email: "liam@example.com",
    grade: "9th Grade",
    subjects: ["Algebra", "Spanish"],
    status: "pending",
    enrollDate: "2025-04-05",
    lastSession: "N/A",
    paymentStatus: "paid"
  },
];

const StudentsManager: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const { toast } = useToast();
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "default";
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "unpaid":
        return "outline";
      case "overdue":
        return "destructive";
      default:
        return "default";
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handlePaymentFilter = (value: string) => {
    setPaymentFilter(value);
  };

  const handleDeleteStudent = (studentId: number) => {
    setStudents(students.filter(student => student.id !== studentId));
    toast({
      title: "Student Deleted",
      description: "The student has been successfully removed.",
      variant: "default",
    });
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || student.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Students</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newStudent = {
                id: students.length + 1,
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                grade: formData.get('grade') as string,
                subjects: (formData.get('subjects') as string).split(',').map(s => s.trim()),
                status: 'active' as const,
                enrollDate: new Date().toISOString().split('T')[0],
                lastSession: 'N/A',
                paymentStatus: 'paid' as const
              };
              setStudents([...students, newStudent]);
              toast({
                title: "Student Added",
                description: "New student has been successfully added to the system.",
              });
              (e.target as HTMLFormElement).reset();
              setIsAddStudentOpen(false);
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                  <Input id="name" name="name" required placeholder="John Smith" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input id="email" name="email" type="email" required placeholder="john.smith@example.com" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="grade" className="text-sm font-medium">Grade Level</label>
                  <Select name="grade" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9th Grade">9th Grade</SelectItem>
                      <SelectItem value="10th Grade">10th Grade</SelectItem>
                      <SelectItem value="11th Grade">11th Grade</SelectItem>
                      <SelectItem value="12th Grade">12th Grade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="subjects" className="text-sm font-medium">Subjects (comma-separated)</label>
                  <Input id="subjects" name="subjects" required placeholder="Mathematics, Physics, Chemistry" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddStudentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
            <Select onValueChange={handleStatusFilter} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={handlePaymentFilter} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Last Session</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.subjects.join(", ")}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(student.status)}>
                      {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentBadgeVariant(student.paymentStatus)}>
                      {student.paymentStatus.charAt(0).toUpperCase() + student.paymentStatus.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{student.lastSession === "N/A" ? "N/A" : new Date(student.lastSession).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteStudent(student.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsManager;
