
import { ClassEvent } from '@/types/tutorTypes';
import { useEventState } from './event-handlers/useEventState';
import { useSelectEvent } from './event-handlers/useSelectEvent';
import { useCreateEvent } from './event-handlers/useCreateEvent';
import { useEditEvent } from './event-handlers/useEditEvent';
import { useDeleteEvent } from './event-handlers/useDeleteEvent';
import { useDuplicateEvent } from './event-handlers/useDuplicateEvent';

export const useEventHandlers = (
  scheduledClasses: ClassEvent[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // State management
  const {
    isEditMode,
    setIsEditMode,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
  } = useEventState();

  // Event selection
  const { handleSelectEvent } = useSelectEvent(
    setSelectedEvent,
    setIsViewEventOpen,
    setActiveEventTab,
    setIsEditMode
  );

  // CRUD operations
  const { handleCreateEvent } = useCreateEvent(scheduledClasses, setScheduledClasses);
  const { handleEditEvent } = useEditEvent(scheduledClasses, setScheduledClasses);
  const { handleDeleteEvent } = useDeleteEvent(
    scheduledClasses,
    setScheduledClasses,
    setIsViewEventOpen
  );
  const { handleDuplicateEvent } = useDuplicateEvent(handleCreateEvent);

  return {
    // State
    isEditMode,
    setIsEditMode,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
    
    // Methods
    handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent,
  };
};

export default useEventHandlers;
