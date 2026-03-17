import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { fetchStudents, deleteStudent as deleteStudentService } from '@/services/students/studentService';

import StudentTable, { Student } from './StudentTable';
import StudentForm from './StudentForm';
import StudentFilters from './StudentFilters';

const StudentsManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: paginatedResult, isLoading, refetch } = useQuery({
    queryKey: ['admin-students', searchTerm],
    queryFn: () => fetchStudents({ page: 1, pageSize: 500, searchTerm }),
    staleTime: 60_000,
  });

  const students: Student[] = (paginatedResult?.data || []).map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    grade: s.grade || '',
    subjects: s.subjects || [],
    status: s.active ? 'active' as const : 'inactive' as const,
    enrollDate: s.enrollmentDate || '',
    lastSession: '',
    paymentStatus: (s.paymentStatus || 'paid') as 'paid' | 'unpaid' | 'overdue',
  }));

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudentService(studentId);
      toast.success('The student has been successfully removed.');
      refetch();
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const handleAddStudent = (_newStudentData: Omit<Student, 'id'>) => {
    toast.success('New student has been successfully added to the system.');
    setIsDialogOpen(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Students</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Student</span>
              <span className="sm:hidden">Add Student</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <StudentForm onAddStudent={handleAddStudent} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
          <StudentFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </CardHeader>
        <CardContent>
          <StudentTable
            students={students}
            isLoading={isLoading}
            onDeleteStudent={handleDeleteStudent}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsManager;
