
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { createRelationship, endRelationship, TutorStudentRelationship } from '@/services/relationships/relationshipService';
import { useAuth } from '@/contexts/AuthContext';

interface RelationshipManagerProps {
  tutors: Array<{ id: string; name: string }>;
  students: Array<{ id: string; name: string }>;
  relationships: TutorStudentRelationship[];
  onRelationshipChange: () => void;
}

const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  tutors,
  students,
  relationships,
  onRelationshipChange
}) => {
  const { user } = useAuth();
  const [selectedTutorId, setSelectedTutorId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const handleCreateRelationship = async () => {
    if (!selectedTutorId || !selectedStudentId) {
      return;
    }

    try {
      await createRelationship({
        tutor_id: selectedTutorId,
        student_id: selectedStudentId
      });
      
      setSelectedTutorId('');
      setSelectedStudentId('');
      onRelationshipChange();
    } catch (error) {
      console.error('Failed to create relationship:', error);
    }
  };

  const handleEndRelationship = async (relationshipId: string) => {
    try {
      await endRelationship(relationshipId);
      onRelationshipChange();
    } catch (error) {
      console.error('Failed to end relationship:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Tutor-Student Relationships</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <select
            className="p-2 border rounded"
            value={selectedTutorId}
            onChange={(e) => setSelectedTutorId(e.target.value)}
          >
            <option value="">Select Tutor</option>
            {tutors.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {tutor.name}
              </option>
            ))}
          </select>
          
          <select
            className="p-2 border rounded"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">Select Student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          
          <Button onClick={handleCreateRelationship}>
            Create Relationship
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tutor</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Assigned At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relationships.map((rel) => (
              <TableRow key={rel.id}>
                <TableCell>
                  {tutors.find(t => t.id === rel.tutor_id)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {students.find(s => s.id === rel.student_id)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {new Date(rel.assigned_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {rel.active ? 'Active' : 'Inactive'}
                </TableCell>
                <TableCell>
                  {rel.active && (
                    <Button
                      variant="destructive"
                      onClick={() => handleEndRelationship(rel.id)}
                    >
                      End Relationship
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RelationshipManager;
