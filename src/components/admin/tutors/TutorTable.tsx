import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { Tutor } from '@/types/tutorTypes';

interface TutorTableProps {
  tutors: Tutor[];
  isLoading: boolean;
  onDelete: (tutorId: string) => void;
  onSelect: (tutor: Tutor) => void;
}

const TutorTable: React.FC<TutorTableProps> = ({
  tutors,
  isLoading,
  onDelete,
  onSelect,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p>Loading tutors...</p>
      </div>
    );
  }

  if (tutors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No tutors found matching your criteria.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tutor</TableHead>
          <TableHead>Subjects</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Classes</TableHead>
          <TableHead>Hourly Rate</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tutors.map((tutor) => (
          <TableRow 
            key={tutor.id} 
            className="cursor-pointer hover:bg-muted/60"
            onClick={() => onSelect(tutor)}
          >
            <TableCell>
              <div className="flex flex-col">
                <div className="font-medium">{tutor.name}</div>
                <div className="text-sm text-muted-foreground">
                  {tutor.email}
                </div>
              </div>
            </TableCell>
            <TableCell>{tutor.subjects.join(', ') || 'None'}</TableCell>
            <TableCell>{tutor.rating}/5</TableCell>
            <TableCell>{tutor.classes}</TableCell>
            <TableCell>${tutor.hourlyRate}/hr</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(tutor.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TutorTable;
