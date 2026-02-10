import React, { useState, useEffect, useCallback } from 'react';
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
import { fetchStudents } from '@/services/dataService';
import { useClassLogs } from '@/hooks/useClassLogs';
import { supabase } from '@/integrations/supabase/client';

import StudentTable, { Student } from './StudentTable';
import StudentForm from './StudentForm';
import StudentFilters from './StudentFilters';
import { parse } from 'date-fns';

const StudentsManager: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { classes } = useClassLogs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchStudentsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const studentData = await fetchStudents();

      // Fetch payment_method and class_rate from students table
      const { data: studentsTableData } = await supabase
        .from('students')
        .select('name, payment_method, class_rate');
      
      const studentsLookup = new Map(
        (studentsTableData || []).map((s: any) => [s.name, { paymentMethod: s.payment_method, classRate: s.class_rate }])
      );

      const enhancedStudents = studentData.map((student) => {
        const studentClasses = classes.filter(
          (cls) => cls.studentName === student.name
        );

        let enrollDate = student.lastSession;
        studentClasses.forEach((cls) => {
          if (cls.date) {
            const d = parse(String(cls.date), 'yyyy-MM-dd', new Date());
            const iso = d.toISOString().split('T')[0];
            if (!enrollDate || d < new Date(enrollDate)) {
              enrollDate = iso;
            }
          }
        });

        const extraData = studentsLookup.get(student.name);

        return {
          id: student.id,
          name: student.name,
          email:
            student.email ||
            student.name.toLowerCase().replace(/\s+/g, '.') + '@example.com',
          grade: '',
          subjects: student.subjects,
          status: 'active' as const,
          enrollDate: enrollDate || new Date().toISOString().split('T')[0],
          lastSession: student.lastSession || 'N/A',
          paymentStatus: 'paid' as const,
          paymentMethod: (extraData?.paymentMethod || 'zelle') as 'stripe' | 'zelle',
          classRate: extraData?.classRate ?? null,
        };
      });

      setStudents(enhancedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load student data');
    } finally {
      setIsLoading(false);
    }
  }, [classes]);

  useEffect(() => {
    if (classes.length === 0) return;
    fetchStudentsData();
  }, [classes, fetchStudentsData]);

  const handleDeleteStudent = (studentId: string) => {
    setStudents(students.filter((student) => student.id !== studentId));
    toast.success('The student has been successfully removed.');
  };

  const handleAddStudent = (newStudentData: Omit<Student, 'id'>) => {
    const newStudent = {
      ...newStudentData,
      id: Date.now().toString(),
    };

    setStudents([...students, newStudent]);
    toast.success('New student has been successfully added to the system.');
    setIsDialogOpen(false);
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Students</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
