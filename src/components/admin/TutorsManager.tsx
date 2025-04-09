
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Mail, Phone } from "lucide-react";

interface Tutor {
  id: number;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  verified: boolean;
  rating: number;
  studentsCount: number;
  nextSession: string;
}

const mockTutors: Tutor[] = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@learn2lead.com",
    phone: "(555) 123-4567",
    subjects: ["Mathematics", "Physics"],
    verified: true,
    rating: 4.9,
    studentsCount: 18,
    nextSession: "2025-04-12T14:00:00"
  },
  {
    id: 2,
    name: "Prof. Michael Chen",
    email: "michael.chen@learn2lead.com",
    phone: "(555) 234-5678",
    subjects: ["Chemistry", "Biology"],
    verified: true,
    rating: 4.7,
    studentsCount: 15,
    nextSession: "2025-04-10T10:30:00"
  },
  {
    id: 3,
    name: "Lisa Rodriguez",
    email: "lisa.rodriguez@learn2lead.com",
    phone: "(555) 345-6789",
    subjects: ["English Literature", "Writing"],
    verified: false,
    rating: 4.5,
    studentsCount: 12,
    nextSession: "2025-04-11T16:15:00"
  },
  {
    id: 4,
    name: "James Wilson",
    email: "james.wilson@learn2lead.com",
    phone: "(555) 456-7890",
    subjects: ["History", "Social Studies"],
    verified: true,
    rating: 4.8,
    studentsCount: 14,
    nextSession: "2025-04-13T13:00:00"
  },
];

const TutorsManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tutors</h2>
        <Button>Add New Tutor</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutor Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Next Session</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTutors.map((tutor) => (
                <TableRow key={tutor.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium flex items-center gap-1">
                        {tutor.name}
                        {tutor.verified && <BadgeCheck className="h-4 w-4 text-green-500" />}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-col gap-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tutor.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {tutor.phone}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{tutor.subjects.join(", ")}</TableCell>
                  <TableCell className="font-medium">{tutor.rating}/5.0</TableCell>
                  <TableCell>{tutor.studentsCount}</TableCell>
                  <TableCell>{new Date(tutor.nextSession).toLocaleDateString()}</TableCell>
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

export default TutorsManager;
