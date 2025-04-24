
import React from 'react';
import { Student } from '@/types/tutorTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteStudent } from '@/services/students/studentService';
import { toast } from 'sonner';

interface StudentsManagerProps {
  students: Student[];
  onSelect: (student: Student) => void;
}

const StudentsManager: React.FC<StudentsManagerProps> = ({ students, onSelect }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleDeleteStudent = async (studentId: string) => {
    try {
      setIsLoading(true);
      await deleteStudent(studentId);
      toast.success("Student deleted successfully");
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error("Failed to delete student");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Students Management</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mt-4">
            {students.map((student) => (
              <div 
                key={student.id} 
                className="p-4 border rounded mb-2 flex justify-between cursor-pointer hover:bg-muted/60"
                onClick={() => onSelect(student)}
              >
                <div>
                  <h3 className="font-medium">{student.name}</h3>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStudent(student.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsManager;
