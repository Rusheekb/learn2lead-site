import React from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { ClassDialogs } from '../ClassDialogs';
import { Profile } from '@/types/profile';

interface TutorSchedulerDialogsProps {
  isViewEventOpen: boolean;
  setIsViewEventOpen: (isOpen: boolean) => void;
  isAddEventOpen: boolean;
  setIsAddEventOpen: (isOpen: boolean) => void;
  selectedEvent: ClassEvent | null;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCreateEvent: (event: ClassEvent) => Promise<boolean>;
  onRefreshData: () => void;
  currentUser?: Pick<Profile, 'first_name' | 'last_name'> | Profile | null;
}

const TutorSchedulerDialogs: React.FC<TutorSchedulerDialogsProps> = ({
  isViewEventOpen,
  setIsViewEventOpen,
  isAddEventOpen,
  setIsAddEventOpen,
  selectedEvent,
  newEvent,
  setNewEvent,
  onCreateEvent,
  onRefreshData,
  currentUser,
}) => {
  return (
    <ClassDialogs
      isAddEventOpen={isAddEventOpen}
      isEditEventOpen={false}
      isViewEventOpen={isViewEventOpen}
      selectedEvent={selectedEvent}
      onCloseDialogs={() => {
        setIsViewEventOpen(false);
        setIsAddEventOpen(false);
      }}
      onRefreshData={onRefreshData}
      newEvent={newEvent}
      setNewEvent={setNewEvent}
      onCreateEvent={onCreateEvent}
      currentUser={currentUser}
    />
  );
};

export default TutorSchedulerDialogs;
