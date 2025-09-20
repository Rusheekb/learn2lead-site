import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createAssignment, endAssignment, TutorStudentAssignment } from '@/services/assignments/assignmentService';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface AssignmentManagerProps {
  tutors: Array<{ id: string; profileId: string; name: string }>;
  students: Array<{ id: string; profileId: string; name: string }>;
  assignments: TutorStudentAssignment[];
  onAssignmentChange: () => void;
}

// Define validation schema
const assignmentSchema = z.object({
  tutorId: z.string().min(1, "Please select a tutor"),
  studentId: z.string().min(1, "Please select a student"),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  tutors,
  students,
  assignments,
  onAssignmentChange
}) => {
  const { user } = useAuth();
  
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      tutorId: '',
      studentId: '',
    },
  });

  const handleCreateAssignment = async (values: AssignmentFormValues) => {
    try {
      // Find the tutor and student to get their profile IDs
      const selectedTutor = tutors.find(t => t.id === values.tutorId);
      const selectedStudent = students.find(s => s.id === values.studentId);
      
      if (!selectedTutor || !selectedStudent) {
        toast.error("Selected tutor or student not found");
        return;
      }

      console.log('Creating assignment with profile IDs:', {
        tutor_id: selectedTutor.profileId,
        student_id: selectedStudent.profileId,
        tutorName: selectedTutor.name,
        studentName: selectedStudent.name
      });

      await createAssignment({
        tutor_id: selectedTutor.profileId, // Use profileId for assignment
        student_id: selectedStudent.profileId // Use profileId for assignment
      });
      
      form.reset();
      onAssignmentChange();
      toast.success("Assignment created successfully");
    } catch (error) {
      console.error('Failed to create assignment:', error);
      toast.error("Failed to create assignment");
    }
  };

  const handleEndAssignment = async (assignmentId: string) => {
    try {
      await endAssignment(assignmentId);
      onAssignmentChange();
      toast.success("Assignment ended successfully");
    } catch (error) {
      console.error('Failed to end assignment:', error);
      toast.error("Failed to end assignment");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Tutor-Student Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleCreateAssignment)} 
            className="flex flex-wrap gap-4 mb-6 items-end"
          >
            <FormField
              control={form.control}
              name="tutorId"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[200px]">
                  <FormLabel>Tutor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Tutor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tutors.map((tutor) => (
                        <SelectItem key={tutor.id} value={tutor.id}>
                          {tutor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[200px]">
                  <FormLabel>Student</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Student" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="mt-auto">
              Create Assignment
            </Button>
          </form>
        </Form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tutor</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Assigned At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell>
                  {tutors.find(t => t.profileId === assignment.tutor_id)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {students.find(s => s.profileId === assignment.student_id)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {new Date(assignment.assigned_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={assignment.active ? "default" : "secondary"}>
                    {assignment.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {assignment.active && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleEndAssignment(assignment.id)}
                    >
                      End Assignment
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AssignmentManager;