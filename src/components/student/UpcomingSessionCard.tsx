
import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, User, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { formatTime } from './ClassSessionDetail';
import { ClassSession } from '@/types/classTypes';

interface UpcomingSessionCardProps {
  session: ClassSession;
}

const UpcomingSessionCard: React.FC<UpcomingSessionCardProps> = ({
  session,
}) => {
  return (
    <div className="p-4 border rounded-md dark:border-gray-700 dark:bg-gray-800">
      <div className="flex justify-between items-start">
        <h3 className="font-medium dark:text-gray-100">{session.title}</h3>
        {session.recurring && (
          <span className="text-xs bg-tutoring-blue/10 text-tutoring-blue dark:bg-tutoring-teal/10 dark:text-tutoring-teal px-2 py-1 rounded">
            Recurring
          </span>
        )}
      </div>
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
        <User className="h-4 w-4 mr-1" />
        <span>{session.tutorName}</span>
      </div>
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-2">
        <CalendarIcon className="h-4 w-4 mr-1" />
        <span>
          {format(new Date(session.date), 'EEE, MMM d')} •{' '}
          {formatTime(session.startTime)}
        </span>
      </div>
      <Button
        variant="link"
        className="p-0 h-auto text-tutoring-blue dark:text-tutoring-teal mt-2"
        asChild
      >
        <a href={session.zoomLink} target="_blank" rel="noopener noreferrer">
          <Video className="h-4 w-4 mr-1 inline" />
          Join Class
        </a>
      </Button>
    </div>
  );
};

export default UpcomingSessionCard;
