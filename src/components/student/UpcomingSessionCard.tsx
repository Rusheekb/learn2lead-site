
import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, User, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { formatTime } from './ClassSessionDetail';
import { ClassSession } from '@/types/classTypes';
import { parseDateToLocal } from '@/utils/safeDateUtils';

interface UpcomingSessionCardProps {
  session: ClassSession;
}

const UpcomingSessionCard: React.FC<UpcomingSessionCardProps> = ({
  session,
}) => {
  return (
    <div 
      className="p-4 border bg-card rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => {
        // This will be handled by the parent component
        const event = new CustomEvent('openClassDetails', { detail: session });
        window.dispatchEvent(event);
      }}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-card-foreground">{session.title}</h3>
        {session.recurring && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            Recurring
          </span>
        )}
      </div>
      <div className="flex items-center text-sm text-muted-foreground mt-1">
        <User className="h-4 w-4 mr-1" />
        <span>{session.tutorName}</span>
      </div>
      <div className="flex items-center text-sm text-muted-foreground mt-2">
        <CalendarIcon className="h-4 w-4 mr-1" />
<span>
          {format(parseDateToLocal(session.date as any), 'EEE, MMM d')} •{' '}
          {formatTime(session.startTime)}
        </span>
      </div>
      <Button
        variant="link"
        className="p-0 h-auto text-primary mt-2"
        asChild
        onClick={(e) => e.stopPropagation()}
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
