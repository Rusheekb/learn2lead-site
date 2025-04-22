import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, FileText } from 'lucide-react';
import { Student } from '@/types/sharedTypes';

interface StudentOverviewProps {
  student: Student;
  onViewMessages: () => void;
  onViewNotes: () => void;
}

const StudentOverview: React.FC<StudentOverviewProps> = ({
  student,
  onViewMessages,
  onViewNotes,
}) => {
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Email</h4>
          <p>{student.email}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Subjects</h4>
          <p>{student.subjects.join(', ')}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Last Session</h4>
          <p>
            {student.lastSession &&
              new Date(student.lastSession).toLocaleDateString()}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Next Session</h4>
          <p>
            {student.nextSession &&
              new Date(student.nextSession).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-500">Progress Notes</h4>
        <p className="mt-1 text-gray-700">{student.progress}</p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onViewMessages}
          className="flex items-center gap-1"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Messages</span>
        </Button>
        <Button onClick={onViewNotes} className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          <span>Notes</span>
        </Button>
      </div>
    </div>
  );
};

export default StudentOverview;
