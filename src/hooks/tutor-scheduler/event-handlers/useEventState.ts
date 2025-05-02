
import { useState } from 'react';
import { ClassEvent } from '@/types/tutorTypes';

export const useEventState = () => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [activeEventTab, setActiveEventTab] = useState<string>('details');

  return {
    isEditMode,
    setIsEditMode,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
  };
};
