import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface EmptySessionsStateProps {
  message: string;
}

const EmptySessionsState: React.FC<EmptySessionsStateProps> = ({ message }) => {
  return (
    <div className="text-center py-8 text-gray-500 border rounded-md">
      <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
      <p>{message}</p>
    </div>
  );
};

export default EmptySessionsState;
