
import React from "react";
import { Clock, MessageSquare, User, Video } from "lucide-react";
import { ClassEvent } from "@/types/tutorTypes";
import { formatTime } from "@/utils/dateTimeUtils";

interface ClassEventCardProps {
  event: ClassEvent;
  onClick: (event: ClassEvent) => void;
  unreadMessagesCount: number;
}

const ClassEventCard: React.FC<ClassEventCardProps> = ({ event, onClick, unreadMessagesCount }) => {
  return (
    <div 
      key={event.id}
      className="p-4 border rounded-md hover:shadow-md transition-shadow cursor-pointer"
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
          {event.recurring && (
            <span className="text-xs bg-tutoring-blue/10 text-tutoring-blue px-2 py-1 rounded">
              Recurring
            </span>
          )}
          {unreadMessagesCount > 0 && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded flex items-center">
              <MessageSquare className="h-3 w-3 mr-1" />
              {unreadMessagesCount} new
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center text-sm text-gray-600 mt-2">
        <Clock className="h-4 w-4 mr-2" />
        <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
      </div>
      
      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-gray-500">
          {event.recurring ? `Every ${event.recurringDays?.join(', ')}` : 'One-time class'}
        </span>
        <a 
          href={event.zoomLink}
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
