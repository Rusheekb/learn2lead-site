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
import { useToast } from '@/components/ui/use-toast';
import { fetchStudents } from '@/services/dataService';
import { useClassLogs } from '@/hooks/useClassLogs';

import StudentTable, { Student } from './StudentTable';
import StudentForm from './StudentForm';
import StudentFilters from './StudentFilters';

const StudentsManager: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { classes } = useClassLogs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchStudentsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const studentData = await fetchStudents();

      const enhancedStudents = studentData.map((student) => {
        const studentClasses = classes.filter(
          (cls) => cls.studentName === student.name
        );

        let status: 'active' | 'inactive' | 'pending' = 'inactive';
        if (student.lastSession) {
          const lastSessionDate = new Date(student.lastSession);
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          if (lastSessionDate >= threeMonthsAgo) status = 'active';
        }

        let paymentStatus: 'paid' | 'unpaid' | 'overdue' = 'paid';
        const unpaidClasses = studentClasses.filter(
          (cls) => cls.studentPayment?.toLowerCase() !== 'paid'
        );
        if (unpaidClasses.length > 0) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const overdue = unpaidClasses.some((cls) => {
            const classDate = new Date(cls.date || '');
            return classDate < thirtyDaysAgo;
          });
          paymentStatus = overdue ? 'overdue' : 'unpaid';
        }

        let enrollDate = student.lastSession;
        studentClasses.forEach((cls) => {
          if (cls.date) {
            const d = new Date(cls.date);
            const iso = d.toISOString().split('T')[0];
            if (!enrollDate || d < new Date(enrollDate)) {
              enrollDate = iso;
            }
          }
        });

        const grade = Math.floor(Math.random() * 4) + 9;

        return {
          id: student.id,
          name: student.name,
          email:
            student.email ||
            student.name.toLowerCase().replace(/\s+/g, '.') + '@example.com',
          grade: `${grade}th Grade`,
          subjects: student.subjects,
          status,
          enrollDate: enrollDate || new Date().toISOString().split('T')[0],
          lastSession: student.lastSession || 'N/A',
          paymentStatus,
        };
      });

      setStudents(enhancedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [classes, toast]);

  useEffect(() => {
    if (classes.length === 0) return;
    fetchStudentsData();
  }, [classes, fetchStudentsData]);

  const handleDeleteStudent = (studentId: string) => {
    setStudents(students.filter((student) => student.id !== studentId));
    toast({
      title: 'Student Deleted',
      description: 'The student has been successfully removed.',
      variant: 'default',
    });
  };

  const handleAddStudent = (newStudentData: Omit<Student, 'id'>) => {
    const newStudent = {
      ...newStudentData,
      id: Date.now().toString(),
    };

    setStudents([...students, newStudent]);
    toast({
      title: 'Student Added',
      description: 'New student has been successfully added to the system.',
    });
    setIsDialogOpen(false);
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || student.status === statusFilter;
    const matchesPayment =
      paymentFilter === 'all' || student.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
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
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            paymentFilter={paymentFilter}
            setPaymentFilter={setPaymentFilter}
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
