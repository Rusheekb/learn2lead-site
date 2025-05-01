
import React from 'react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: string;
  sender: string;
  timestamp: string;
  isTutor: boolean;
  isRead?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  sender,
  timestamp,
  isTutor,
  isRead,
}) => {
  return (
    <div
      className={cn(
        'mb-4',
        isTutor ? 'flex justify-end' : 'flex justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-4 py-2 shadow-sm',
          isTutor
            ? 'bg-tutoring-blue text-white rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">{sender}</span>
          <span className="text-xs opacity-70">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
        {!isTutor && (
          <div className="text-xs text-right mt-1">
            {isRead ? 'Read' : 'Delivered'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
