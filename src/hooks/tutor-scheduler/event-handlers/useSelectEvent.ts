
import { useState } from 'react';
import { ClassEvent } from '@/types/tutorTypes';

export const useSelectEvent = (
  setSelectedEvent: React.Dispatch<React.SetStateAction<ClassEvent | null>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setActiveEventTab: React.Dispatch<React.SetStateAction<string>>,
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
    setActiveEventTab('details');
    setIsEditMode(false);
  };

  return { handleSelectEvent };
};
