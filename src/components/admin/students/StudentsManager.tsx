import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { deleteStudent as deleteStudentService } from '@/services/students/studentService';
import { supabase } from '@/integrations/supabase/client';

import StudentTable, { Student } from './StudentTable';
import StudentForm from './StudentForm';
import StudentFilters from './StudentFilters';
import StudentDetailDrawer from './StudentDetailDrawer';

interface OverviewRow {
  student_id: string;
  profile_id: string | null;
  name: string;
  email: string;
  active: boolean;
  class_rate: number | null;
  credits_remaining: number;
  last_class_date: string | null;
  next_class_date: string | null;
}

type ActiveFilter = 'all' | 'active' | 'inactive';
type CreditFilter = 'all' | 'none' | 'low' | 'ok';

const StudentsManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [creditFilter, setCreditFilter] = useState<CreditFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);

  const {
    data: overviewRows = [],
    isLoading,
    refetch,
  } = useQuery<OverviewRow[]>({
    queryKey: ['admin-student-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_student_overview');
      if (error) throw error;
      return (data as unknown as OverviewRow[]) || [];
    },
    staleTime: 60_000,
  });

  const students: Student[] = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return overviewRows
      .filter((r) => {
        if (
          term &&
          !r.name.toLowerCase().includes(term) &&
          !r.email.toLowerCase().includes(term)
        )
          return false;
        if (activeFilter === 'active' && !r.active) return false;
        if (activeFilter === 'inactive' && r.active) return false;
        if (creditFilter === 'none' && (r.credits_remaining ?? 0) > 0)
          return false;
        if (
          creditFilter === 'low' &&
          ((r.credits_remaining ?? 0) === 0 || (r.credits_remaining ?? 0) > 2)
        )
          return false;
        if (creditFilter === 'ok' && (r.credits_remaining ?? 0) <= 2)
          return false;
        return true;
      })
      .map((r) => ({
        id: r.student_id,
        profileId: r.profile_id,
        name: r.name,
        email: r.email,
        grade: '',
        subjects: [],
        status: r.active ? ('active' as const) : ('inactive' as const),
        enrollDate: '',
        lastSession: r.last_class_date || '',
        paymentStatus: 'paid' as const,
        classRate: r.class_rate,
        creditsRemaining: r.credits_remaining,
        nextClassDate: r.next_class_date,
      }));
  }, [overviewRows, searchTerm]);

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudentService(studentId);
      toast.success('The student has been successfully removed.');
      refetch();
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const handleAddStudent = () => {
    toast.success('New student has been successfully added to the system.');
    setIsDialogOpen(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Students
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="flex items-center gap-2 w-full sm:w-auto"
              size="sm"
            >
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Student Directory</CardTitle>
            <div className="flex gap-3 text-xs text-muted-foreground items-center">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{' '}
                Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{' '}
                Low credits
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-destructive inline-block" />{' '}
                No credits
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <StudentFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
            <Select
              value={activeFilter}
              onValueChange={(v) => setActiveFilter(v as ActiveFilter)}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={creditFilter}
              onValueChange={(v) => setCreditFilter(v as CreditFilter)}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Credits" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All credit levels</SelectItem>
                <SelectItem value="none">No credits (0)</SelectItem>
                <SelectItem value="low">Low credits (1-2)</SelectItem>
                <SelectItem value="ok">Healthy (3+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <StudentTable
            students={students}
            isLoading={isLoading}
            onDeleteStudent={handleDeleteStudent}
            onStudentClick={setDrawerStudent}
          />
        </CardContent>
      </Card>

      <StudentDetailDrawer
        student={drawerStudent}
        open={!!drawerStudent}
        onOpenChange={(open) => {
          if (!open) setDrawerStudent(null);
        }}
      />
    </div>
  );
};

export default StudentsManager;
