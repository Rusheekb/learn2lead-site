
import React, { useState } from 'react';
import { Tutor } from '@/types/tutorTypes';
import TutorTable from './tutors/TutorTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { deleteTutor } from '@/services/tutors/tutorService';

interface TutorsManagerProps {
  tutors: Tutor[];
  onSelect: (tutor: Tutor) => void;
}

const TutorsManager: React.FC<TutorsManagerProps> = ({ tutors, onSelect }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteTutor = async (tutorId: string) => {
    try {
      setIsLoading(true);
      await deleteTutor(tutorId);
      toast.success("Tutor deleted successfully");
    } catch (error) {
      console.error('Error deleting tutor:', error);
      toast.error("Failed to delete tutor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Tutors Management</h2>

      <Card>
        <CardHeader>
          <CardTitle>Tutor Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <TutorTable 
            tutors={tutors} 
            isLoading={isLoading} 
            onDelete={handleDeleteTutor}
            onSelect={onSelect}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorsManager;
