
import React from 'react';
import { toast } from 'sonner';
import { mockStudents } from './mock-data-students';
import SchedulerHeader from './SchedulerHeader';
import SchedulerFilter from './SchedulerFilter';
import CalendarWithEvents from './CalendarWithEvents';
import ClassDialogs from './ClassDialogs';
import { useTutorScheduler } from '@/hooks/useTutorScheduler';
import TableSkeleton from '../common/TableSkeleton';

const TutorScheduler: React.FC = () => {
  // Use our comprehensive hook with all the scheduler functionality
  const {
    // State
    selectedDate,
    setSelectedDate,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    selectedEvent,
    activeEventTab,
    setActiveEventTab,
    isEditMode,
    setIsEditMode,
    searchTerm,
    setSearchTerm,
    subjectFilter,
    setSubjectFilter,
    studentFilter,
    setStudentFilter,
    newEvent,
    setNewEvent,
    filteredClasses,
    allSubjects,
    studentMessages,
    studentUploads,
    isLoading,
    
    // Methods
    handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent,
    resetNewEventForm,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
  } = useTutorScheduler();

  // Display loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="space-y-6">
        <SchedulerHeader onAddClick={() => setIsAddEventOpen(true)} />
        <TableSkeleton 
          columns={['Date', 'Time', 'Student', 'Subject', 'Actions']} 
          rowCount={5} 
          cellWidths={['w-24', 'w-32', 'w-40', 'w-32', 'w-24']} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SchedulerHeader onAddClick={() => setIsAddEventOpen(true)} />

      <SchedulerFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        subjectFilter={subjectFilter}
        setSubjectFilter={setSubjectFilter}
        studentFilter={studentFilter}
        setStudentFilter={setStudentFilter}
        allSubjects={allSubjects || []}
        students={mockStudents}
      />

      <CalendarWithEvents
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        scheduledClasses={filteredClasses}
        onSelectEvent={handleSelectEvent}
        onAddEventClick={() => setIsAddEventOpen(true)}
        getUnreadMessageCount={getUnreadMessageCount}
      />

      <ClassDialogs
        isViewEventOpen={isViewEventOpen}
        setIsViewEventOpen={setIsViewEventOpen}
        isAddEventOpen={isAddEventOpen}
        setIsAddEventOpen={setIsAddEventOpen}
        selectedEvent={selectedEvent}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        activeEventTab={activeEventTab}
        setActiveEventTab={setActiveEventTab}
        studentMessages={studentMessages}
        studentUploads={studentUploads}
        students={mockStudents}
        onCreateEvent={() => handleCreateEvent(newEvent as any)}
        onEditEvent={() => handleEditEvent(selectedEvent as any)}
        onDuplicateEvent={handleDuplicateEvent}
        onDeleteEvent={handleDeleteEvent}
        onResetForm={resetNewEventForm}
        onMarkAsRead={handleMarkMessageRead}
        onDownloadFile={handleDownloadFile}
        getUnreadMessageCount={getUnreadMessageCount}
      />
    </div>
  );
};

export default TutorScheduler;
