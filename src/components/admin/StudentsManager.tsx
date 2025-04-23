
import React from 'react';
import { Student } from '@/types/tutorTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteStudent } from '@/services/supabaseClient';
import { toast } from 'sonner';

interface StudentsManagerProps {
  students: Student[];
}

const StudentsManager: React.FC<StudentsManagerProps> = ({ students }) => {
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
          {/* You'll need to implement or import a StudentTable component */}
          <p>Total Students: {students.length}</p>
          {/* This is a placeholder. In a real implementation, you would render a table of students */}
          <div className="mt-4">
            {students.map((student) => (
              <div key={student.id} className="p-4 border rounded mb-2 flex justify-between">
                <div>
                  <h3 className="font-medium">{student.name}</h3>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
                <button 
                  onClick={() => handleDeleteStudent(student.id)}
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
