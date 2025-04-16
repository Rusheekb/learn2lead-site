
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  status: "active" | "inactive" | "pending";
  enrollDate: string;
  lastSession: string;
  paymentStatus: "paid" | "unpaid" | "overdue";
}

interface StudentTableProps {
  students: Student[];
  isLoading: boolean;
  onDeleteStudent: (studentId: string) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({ 
  students, 
  isLoading,
  onDeleteStudent 
}) => {
  // Function to format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p>Loading students...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No students found matching your criteria.</p>
      </div>
    );
  }

  return (
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
        {students.map((student) => (
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
            <TableCell>{student.lastSession === "N/A" ? "N/A" : formatDate(student.lastSession)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDeleteStudent(student.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default StudentTable;
