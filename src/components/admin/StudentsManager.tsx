
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "secondary";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "success";
      case "unpaid":
        return "warning";
      case "overdue":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Students</h2>
        <Button>Add New Student</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
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
              {mockStudents.map((student) => (
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
                    <Button variant="outline" size="sm">View Details</Button>
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
