import React, { useEffect, memo } from 'react';
import { useSimplifiedTutorScheduler as useTutorScheduler } from '@/hooks/useSimplifiedTutorScheduler';
import TutorSchedulerHeader from './scheduler/TutorSchedulerHeader';
import TutorSchedulerCalendar from './scheduler/TutorSchedulerCalendar';
import TutorSchedulerDialogs from './scheduler/TutorSchedulerDialogs';
import { CalendarSkeleton } from '@/components/shared/skeletons';
import { useAuth } from '@/contexts/AuthContext';

const TutorScheduler: React.FC = memo(() => {
  const { user } = useAuth();

  const {
    selectedDate,
    setSelectedDate,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    selectedEvent,
    newEvent,
    setNewEvent,
    filteredClasses,
    isLoading,
    currentUser,
    handleSelectEvent,
    handleCreateEvent,
    refreshData,
  } = useTutorScheduler();

  // Set tutorId on new event when user is available
  useEffect(() => {
    if (user?.id && newEvent && !newEvent.tutorId) {
      const tutorName = currentUser?.first_name
        ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
        : 'Current Tutor';

      setNewEvent({
        ...newEvent,
        tutorId: user.id,
        tutorName,
      });
    }
  }, [user?.id, newEvent, setNewEvent]);

  const handleAddEventClick = () => {
    setNewEvent((prev) => ({ ...prev, date: selectedDate }));
    setIsAddEventOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <TutorSchedulerHeader onAddClick={handleAddEventClick} />
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <TutorSchedulerHeader onAddClick={handleAddEventClick} />

      <div className="overflow-x-auto">
        <TutorSchedulerCalendar
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          scheduledClasses={filteredClasses}
          onSelectEvent={handleSelectEvent}
          onAddEventClick={handleAddEventClick}
        />
      </div>

      <TutorSchedulerDialogs
        isViewEventOpen={isViewEventOpen}
        setIsViewEventOpen={setIsViewEventOpen}
        isAddEventOpen={isAddEventOpen}
        setIsAddEventOpen={setIsAddEventOpen}
        selectedEvent={selectedEvent}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        onCreateEvent={handleCreateEvent}
        onRefreshData={refreshData}
        currentUser={currentUser}
      />
    </div>
  );
});

TutorScheduler.displayName = 'TutorScheduler';

export default TutorScheduler;
