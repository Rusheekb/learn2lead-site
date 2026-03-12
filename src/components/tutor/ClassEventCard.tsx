
import React from 'react';
import { Clock, MessageSquare, User, Video } from 'lucide-react';
import { ClassEvent } from '@/types/tutorTypes';
import { formatTimeRange } from '@/utils/dateTimeUtils';
import { RecurringBadge, MessageBadge } from '@/components/shared/ClassBadges';

export interface ClassEventCardProps {
  event: ClassEvent;
  onClick: (event: ClassEvent) => void;
  unreadMessageCount: number;
}

const ClassEventCard: React.FC<ClassEventCardProps> = ({
  event,
  onClick,
  unreadMessageCount,
}) => {
  return (
    <div
      key={event.id}
      className="p-3 sm:p-4 border rounded-md bg-card hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(event)}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm sm:text-base truncate">{event.title}</h3>
          <div className="flex items-center text-xs sm:text-sm text-muted-foreground mt-1">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
            <span className="truncate">{event.studentName}</span>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {event.recurring && <RecurringBadge />}
          {unreadMessageCount > 0 && (
            <MessageBadge count={unreadMessageCount} />
          )}
        </div>
      </div>

      <div className="flex items-center text-xs sm:text-sm text-muted-foreground mt-2">
        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 shrink-0" />
        <span>
          {formatTimeRange(event.startTime, event.endTime)}
        </span>
      </div>

      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-muted-foreground">
          {event.recurring
            ? `Every ${event.recurringDays?.join(', ')}`
            : 'One-time class'}
        </span>
        {event.zoomLink && (
          <a
            href={event.zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">Join Class</span>
            <span className="sm:hidden">Join</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default ClassEventCard;
