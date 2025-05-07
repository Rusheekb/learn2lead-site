
import React from 'react';
import { Clock, MessageSquare, User, Video } from 'lucide-react';
import { ClassEvent } from '@/types/tutorTypes';
import { formatTime } from '@/utils/dateTimeUtils';
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
      className="p-4 border rounded-md bg-white hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(event)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{event.title}</h3>
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <User className="h-4 w-4 mr-1" />
            <span>{event.studentName}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {event.recurring && <RecurringBadge />}
          {unreadMessageCount > 0 && (
            <MessageBadge count={unreadMessageCount} />
          )}
        </div>
      </div>

      <div className="flex items-center text-sm text-gray-600 mt-2">
        <Clock className="h-4 w-4 mr-2" />
        <span>
          {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </span>
      </div>

      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-gray-500">
          {event.recurring
            ? `Every ${event.recurringDays?.join(', ')}`
            : 'One-time class'}
        </span>
        <a
          href={event.zoomLink || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-tutoring-blue hover:text-tutoring-teal transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Video className="h-4 w-4 mr-1" />
          <span>Join Class</span>
        </a>
      </div>
    </div>
  );
};

export default ClassEventCard;
