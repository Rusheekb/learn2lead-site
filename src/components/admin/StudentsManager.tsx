
import React, { useState } from 'react';
import { Student } from '@/types/tutorTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';
import SearchInput from '@/components/shared/filters/SearchInput';
import PaginationControls from '@/components/common/Pagination';
import { useStudentsQuery } from '@/hooks/queries/useStudentsQuery';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { RolePromotionDialog } from './RolePromotionDialog';

interface StudentsManagerProps {
  onSelect: (student: Student) => void;
}

const StudentsManager: React.FC<StudentsManagerProps> = ({ onSelect }) => {
  const { userRole } = useAuth();
  const [promotionStudent, setPromotionStudent] = useState<Student | null>(null);
  const {
    students,
    isLoading,
    deleteStudent,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    searchTerm,
    setSearchTerm,
    refetch,
  } = useStudentsQuery();
  
  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      toast.success("Student deleted successfully");
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error("Failed to delete student");
    }
  };

  const handlePromotionSuccess = () => {
    setPromotionStudent(null);
    refetch();
  };

  const isAdmin = userRole === 'admin';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Students Management</h2>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Student Directory</CardTitle>
            <SearchInput 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              placeholder="Search students..." 
              className="w-full md:w-64" 
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-4">No students found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow
                    key={student.id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() => onSelect(student)}
                  >
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromotionStudent(student);
                            }}
                            className="flex items-center gap-1"
                          >
                            <UserCheck className="h-3 w-3" />
                            Promote
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudent(student.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            onPageChange={goToPage}
            className="mt-4"
          />
        </CardContent>
      </Card>

      <RolePromotionDialog
        isOpen={!!promotionStudent}
        onClose={() => setPromotionStudent(null)}
        user={promotionStudent ? {
          id: promotionStudent.id,
          email: promotionStudent.email,
          name: promotionStudent.name,
          role: 'student' as const
        } : null}
        onSuccess={handlePromotionSuccess}
      />
    </div>
  );
};

export default StudentsManager;
