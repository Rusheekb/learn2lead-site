
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
    <div className="p-6 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-750 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-white text-lg">{session.title}</h3>
        {session.recurring && (
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
            Recurring
          </span>
        )}
      </div>
      <div className="flex items-center text-sm text-gray-400 mb-2">
        <User className="h-4 w-4 mr-2" />
        <span>{session.tutorName}</span>
      </div>
      <div className="flex items-center text-sm text-gray-400 mb-4">
        <CalendarIcon className="h-4 w-4 mr-2" />
        <span>
          {format(new Date(session.date), 'EEE, MMM d')} • {formatTime(session.startTime)}
        </span>
      </div>
      <div className="flex justify-end">
        <a 
          href={session.zoomLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center text-teal-400 hover:text-teal-300 transition-colors font-medium"
        >
          <Video className="h-4 w-4 mr-2" />
          Join Class
        </a>
      </div>
    </div>
  );
};

export default UpcomingSessionCard;
