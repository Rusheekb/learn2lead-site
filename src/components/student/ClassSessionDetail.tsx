
/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, User, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ClassSession {
  id: string; // Changed from number to string
  title: string;
  subjectId: string | number;
  tutorName: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  zoomLink: string;
  recurring: boolean;
  recurringDays?: string[];
}

interface SessionDetailProps {
  session: ClassSession;
}

// Format time utility function
export const formatTime = (timeString: string) => {
  const [hourStr, minuteStr] = timeString.split(':');
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

const ClassSessionDetail: React.FC<SessionDetailProps> = ({ session }) => {
  return (
    <div className="p-4 border rounded-md mb-3 bg-white">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{session.title}</h3>
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <User className="h-4 w-4 mr-1" />
            <span>{session.tutorName}</span>
          </div>
        </div>
        {session.recurring && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            Recurring
          </span>
        )}
      </div>

      <div className="flex items-center text-sm text-gray-600 mb-2">
        <Clock className="h-4 w-4 mr-2" />
        <span>
          {formatTime(session.startTime)} - {formatTime(session.endTime)}
        </span>
      </div>

      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-gray-500">
          {session.recurring
            ? 'Every ' + session.recurringDays?.join(', ')
            : 'One-time class'}
        </span>
        <a
          href={session.zoomLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <Video className="h-4 w-4 mr-1" />
          <span>Join Class</span>
        </a>
      </div>
    </div>
  );
};

export default ClassSessionDetail;
