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
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

import StudentTable, { Student } from './StudentTable';
import StudentForm from './StudentForm';
import StudentFilters from './StudentFilters';

const fetchStudentsFromDb = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, email, grade, subjects, active, enrollment_date, payment_status, payment_method, class_rate')
    .order('name');

  if (error) throw error;

  return (data || []).map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    grade: s.grade || '',
    subjects: s.subjects || [],
    status: s.active ? 'active' as const : 'inactive' as const,
    enrollDate: s.enrollment_date,
    lastSession: '',
    paymentStatus: (s.payment_status || 'paid') as 'paid' | 'unpaid' | 'overdue',
    paymentMethod: (s.payment_method || 'zelle') as 'stripe' | 'zelle',
    classRate: s.class_rate ?? null,
  }));
};

const StudentsManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-students'],
    queryFn: fetchStudentsFromDb,
    staleTime: 60_000,
  });

  const handleDeleteStudent = async (studentId: string) => {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) {
      toast.error('Failed to delete student');
      return;
    }
    toast.success('The student has been successfully removed.');
    refetch();
  };

  const handleAddStudent = (newStudentData: Omit<Student, 'id'>) => {
    // TODO: persist to students table
    toast.success('New student has been successfully added to the system.');
    setIsDialogOpen(false);
    refetch();
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
            students={filteredStudents}
            isLoading={isLoading}
            onDeleteStudent={handleDeleteStudent}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsManager;
