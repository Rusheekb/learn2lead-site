
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { createRelationship, endRelationship, TutorStudentRelationship } from '@/services/relationships/relationshipService';
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

interface RelationshipManagerProps {
  tutors: Array<{ id: string; name: string }>;
  students: Array<{ id: string; name: string }>;
  relationships: TutorStudentRelationship[];
  onRelationshipChange: () => void;
}

// Define validation schema
const relationshipSchema = z.object({
  tutor_id: z.string().min(1, { message: "Please select a tutor" }),
  student_id: z.string().min(1, { message: "Please select a student" }),
});

type RelationshipFormValues = z.infer<typeof relationshipSchema>;

const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  tutors,
  students,
  relationships,
  onRelationshipChange
}) => {
  const { user } = useAuth();
  
  const form = useForm<RelationshipFormValues>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      tutor_id: '',
      student_id: '',
    },
  });

  const handleCreateRelationship = async (values: RelationshipFormValues) => {
    try {
      await createRelationship({
        tutor_id: values.tutor_id,
        student_id: values.student_id
      });
      
      form.reset();
      onRelationshipChange();
      toast.success("Relationship created successfully");
    } catch (error) {
      console.error('Failed to create relationship:', error);
      toast.error("Failed to create relationship");
    }
  };

  const handleEndRelationship = async (relationshipId: string) => {
    try {
      await endRelationship(relationshipId);
      onRelationshipChange();
      toast.success("Relationship ended successfully");
    } catch (error) {
      console.error('Failed to end relationship:', error);
      toast.error("Failed to end relationship");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Tutor-Student Relationships</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleCreateRelationship)} 
            className="flex flex-wrap gap-4 mb-6 items-end"
          >
            <FormField
              control={form.control}
              name="tutor_id"
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
              name="student_id"
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
              Create Relationship
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
            {relationships.map((rel) => (
              <TableRow key={rel.id}>
                <TableCell>
                  {tutors.find(t => t.id === rel.tutor_id)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {students.find(s => s.id === rel.student_id)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {new Date(rel.assigned_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {rel.active ? 'Active' : 'Inactive'}
                </TableCell>
                <TableCell>
                  {rel.active && (
                    <Button
                      variant="destructive"
                      onClick={() => handleEndRelationship(rel.id)}
                    >
                      End Relationship
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

export default RelationshipManager;
